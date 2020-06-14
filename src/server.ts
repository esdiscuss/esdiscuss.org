import 'dotenv/config';
import {join} from 'path';
import express from 'express';
import moment from 'moment';
import cookieSession from 'cookie-session';
import ms from 'ms';

import './search';
import * as db from './database';
import { renderMessage } from './process';
import pipermailUnresolve from './pipermail-unresolve';
import notesApp from './notes';

var browserify = require('browserify-middleware');
var less = require('jstransformer')(require('jstransformer-less'));
var cleanCss = require('jstransformer')(require('jstransformer-clean-css'));
var prepare = require('prepare-response');

var version = require('../package.json').version;

var app = express();

app.locals.asset = function (path: string) {
  return '/static/' + version + path
}
app.set('view engine', 'pug');
app.set('views', __dirname + '/../views');

app.use(require('serve-favicon')(__dirname + '/../favicon.ico'));
app.use(function (req, res, next) {
  res.locals.path = req.path
  next()
})

var staticOpts = { maxAge: !process.env.NODE_ENV || process.env.NODE_ENV === 'development' ? 0 : ms('12 months') };
var staticPath = function (dir: string) {
  return '/static/' + version + '/' + dir;
}
app.use('/static/' + version, express.static(join(__dirname, '..', 'static'), staticOpts));
browserify.settings.production('cache', '12 months');
app.get(staticPath('client/listing.js'), browserify('./client/listing.js'));
app.get(staticPath('client/topic.js'), browserify('./client/topic.js'));
app.get(staticPath('client/edit.js'), browserify('./client/edit.js'));
app.get(staticPath('client/login.js'), browserify('./client/login.js'));

function getStyleResponse() {
  return less.renderFileAsync(__dirname + '/../less/style.less').then(
    (result: {body: string}) => cleanCss.renderAsync(result.body)
  ).then((result: {body: string}) => prepare(result.body, {
    'content-type': 'css',
    'cache-control': process.env.NODE_ENV === 'production' ? '1 hour' : '1 second',
  }));
}
var styleResponse = getStyleResponse();
app.get(staticPath('style.css'), function (req, res, next) {
  (process.env.NODE_ENV === 'production' ? styleResponse : getStyleResponse()).done(function (response: any) {
    response.send(req, res, next);
  }, next);
});

app.get('/', function (_req, res) {
  res.render('home', {});
});

app.get('/robots.txt', function (_req, res) {
  res.end('User-agent: *\nDisallow: /source');
});
app.get('/about', function (_req, res) {
  res.render('about');
})
app.get('/rss', function (_req, res, next) {
  var page = 0;
  db.page(page).then(function (topics) {
    if (topics.length === 0) return next();
    res.set('Content-Type', 'application/rss+xml');
    res.render('rss', {
      topics: topics
    });
  }).catch(next);
});
app.get('/:page', function (req, res, next) {
  if (!/^\d+$/.test(req.params.page)) return next();

  var page = parseInt(req.params.page, 10) - 1;

  if (page < 0) return next();

  db.page(page).then(function (topics) {
    if (topics.length === 0) return next();
    var last = topics.last;
    res.render('listing', {
      last: last,
      id: page + 1,
      topics: topics
    });
  }).catch(next);
});
app.get('/topic/:id', function (req, res, next) {
  db.topic(req.params.id as db.TopicSlug).then((topic) => {
    if (topic.length === 0) return next();

    res.render('topic', {
      topic: topic[0],
      messages: topic.map((message) => ({
          ...message,
          edited: renderMessage(message.edited),
          date: moment(message.date),
        })
      )
    });
  }).catch(next);
});
app.get('/topic/:id', function (req, res, next) {
  db.getNewLocation(req.params.id as db.TopicKey)
    .then(function (newLocation) {
      if (!newLocation) return next();
      res.redirect(301, '/topic/' + newLocation)
    }).catch(next);
});

app.get('/search-result/:id', function (req, res, next) {
  return db.locationFromSearchKey(req.params.id as db.MessageKey).then(function (location) {
    if (!location) return next();
    res.redirect(301, '/topic/' + location.topic_slug + '#content-' + location.messageNum);
  }).catch(next);
})

app.get('/pipermail/es-discuss/:month/:id.html', function (req, res, next) {
  pipermailUnresolve(req.params.month, req.params.id)
    .then(function (location) {
      if (!location) return next();
      res.redirect(301, location);
    })
    .catch(next);
})

app.use(notesApp);

var request = require('request');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var authed = express();

passport.serializeUser(function (user: any, done: any) {
  done(null, user.email);
});
passport.deserializeUser(function (email: any, done: any) {
  db.user(email).then(res => done(null, res), err => done(err))
});

var audience = process.env.BROWSERID_AUDIENCE || 'http://localhost:3000';
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '28627d32a6318f773fd3',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '6baddae5b8ea007f43f0312be1afc07eb2ea19d0',
  callbackURL: audience + '/auth/github/callback',
  scope: 'user:email'
}, function (accessToken: any, _refreshToken: any, _profile: any, done: any) {
  request({
    url: 'https://api.github.com/user/emails?access_token=' + accessToken,
    headers: { 'user-agent': 'esdiscuss.org', 'Accept': 'application/vnd.github.v3' }
  }, function (err: any, res: any) {
    if (err) return done(err)
    if (res.statusCode !== 200) return done(new Error('https://api.github.com/user/emails returned ' + res.statusCode + ' ' + res.body.toString()))
    var email
    try {
      email = JSON.parse(res.body.toString()).filter(function (e: any) { return e.primary && e.verified })[0]
      if (email) email = email.email
    } catch (ex) {
      return done(ex)
    }
    if (!email) return done(new Error('Your primary e-mail must be verified.'))
    db.user(email).then(res => done(null, res), err => done(err))
  })
}))

authed.use(require('body-parser')())
authed.use(cookieSession({
  keys: [process.env.COOKIE_SECRET || 'adfkasjast'],
  signed: true
}));
authed.use(passport.initialize());
authed.use(passport.session());

function requireAuth() {
  return function (req: any, res: any, next: any) {
    if (req.user) return next()
    res.render('login.pug', {url: req.url})
  }
}

authed.get('/auth/github', function (req, _res, next) {
  (req as any).session.url = req.query.url
  next()
}, passport.authenticate('github'))
authed.get('/auth/github/callback', function (req, res, next) {
  passport.authenticate('github', function(err: any, user: any, _info: any) {
    if (err) return next(err)
    var url: string | null = (req as any).session.url
    if ('url' in (req as any).session) delete (req as any).session.url
    if (!user) return (res as any).redirect(url || '/')
    (req as any).logIn(user, function(err: any) {
      if (err) return next(err)
      return res.redirect(url || '/')
    })
  })(req, res, next)
})
authed.post('/auth/persona', passport.authenticate('persona'), function (_req, res) {
  res.send(true);
})
authed.post('/auth/logout', function (req, res, _next) {
  (req as any).logout();
  res.send(true);
})

app.get('/history/:id', function (req, res, next) {
  db.history(req.params.id as db.MessageKey)
    .then(function (history) {
      if (!history) return next()
      res.render('history.pug', {message: history, path: req.query.path})
    })
    .catch(next)
})
authed.get('/edit/:id', requireAuth(), function (req, res, next) {
  db.message(req.params.id as db.MessageKey)
    .then(function (message) {
      if (!message) return next()
      res.render('edit.pug', {message: message, user: (req as any).user, url: req.url})
    })
    .catch(next)
})
var moderators = [
  'forbes at lindesay.co.uk',
  'domenic at domenicdenicola.com',
  'dignifiedquire at gmail.com',
  'd at domenic.me',
  'mathias at qiwi.be'
].map(function (u) { return u.replace(' at ', '@') })
authed.post('/edit/:id', function (req, res, next) {
  if (!(req as any).user || !(req as any).user.email) {
    res.statusCode = 403
    return res.end('Access Denied')
  }
  var edited = req.body.edited.replace(/\r/g, '')
  db.message(req.params.id as db.MessageKey)
    .then(function (message) {
      if (!message) {
        return;
      }
      if (edited === message.edited.replace(/\r/g, '')) {
        return
      } else if (semantic(edited) === semantic(message.edited) || moderators.indexOf((req as any).user.email) != -1 || message.from.email === (req as any).user.email){
        return db.update(req.params.id as db.MessageKey, edited, (req as any).user.email)
      } else {
        throw new Error('Since this change is semantic, it requires moderation.')
      }
    })
    .then(function () {
      if (req.query.path) {
        res.redirect(req.query.path as string)
      } else {
        res.redirect(req.url)
      }
    })
    .catch(next)
})

function semantic(a: string) {
  return a.replace(/\r/g, '').replace(/\n```js\n/gi, '').replace(/\n```javascript\n/gi, '').replace(/`/g, '').replace(/\s/g, '')
}

authed.locals = app.locals

app.use(authed)

var PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('listening on localhost:' + PORT);
