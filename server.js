if (process.env.NEW_RELIC_LICENSE_KEY) require('newrelic');
var jade = require('jade');
var express = require('express');
var moment = require('moment');
var Q = require('q');
var fs = require('fs');
var browserify = require('browserify-middleware');
var join = require('path').join;
var gethub = require('gethub');
var ms = require('ms');
var less = require('transform')('less');

function s(n) { return ms(n) / 1000 }

//var console = require('./lib/console')('server');
var version = require('./package.json').version;
var unresolve = require('./lib/pipermail-unresolve');
var db = require('./lib/database');
var processor = require('./lib/process');
var profiles = require('./profiles');

var app = express();

app.locals.asset = function (path) {
  return '/static/' + version + path
}
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(require('static-favicon')(__dirname + '/favicon.ico'));
app.use(function (req, res, next) {
  res.locals.path = req.path
  next()
})

var staticOpts = { maxAge: !process.env.NODE_ENV || process.env.NODE_ENV === 'development' ? 0 : ms('12 months') };
var staticPath = function (dir) {
  return '/static/' + version + '/' + dir;
}
app.use('/static/' + version, express.static(join(__dirname, 'static'), staticOpts));
browserify.settings.production('cache', '12 months');
app.get(staticPath('client/listing.js'), browserify('./client/listing.js'));
app.get(staticPath('client/topic.js'), browserify('./client/topic.js'));
app.get(staticPath('client/edit.js'), browserify('./client/edit.js'));
app.get(staticPath('client/login.js'), browserify('./client/login.js'));

app.get('/style.css', less('./less/style.less'));

app.get('/', function (req, res) {
  res.render('home', {});
});

app.get('/robots.txt', function (req, res) {
  res.end('User-agent: *\nDisallow: /source');
});
app.get('/about', function (req, res, next) {
  var allTime = db.botRuns();
  db.botRuns().then(function (stats) {
    res.render('about', {
      allTime: stats
    });
  }).done(null, next);
})

app.get('/:page', function (req, res, next) {
  if (!/^\d+$/.test(req.params.page)) return next();

  var page = req.params.page - 1;

  if (page < 0) return next();

  db.page(page)
    .done(function (topics) {
      if (topics.length === 0) return next();
      var last = topics.last;
      res.render('listing', {
        last: last,
        id: page + 1,
        topics: topics
      });
    }, next);
});
app.get('/topic/:id', function (req, res, next) {
  db.topic(req.params.id)
    .done(function (topic) {
      if (topic.length === 0) return next();

      topic.forEach(function (message) {
        message.edited = processor.renderMessage(message.edited);
        message.date = moment(message.date)
      });
      res.render('topic', {
        topic: topic[0],
        messages: topic
      });
    }, next);
});
app.get('/topic/:id', function (req, res, next) {
  db.getNewLocation(req.params.id)
    .done(function (newLocation) {
      if (!newLocation) return next();
      res.redirect(301, '/topic/' + newLocation)
    }, next);
});


app.get('/pipermail/es-discuss/:month/:id.html', function (req, res, next) {
  unresolve(req.params.month, req.params.id)
    .then(function (location) {
      if (!location) return next();
      res.redirect(301, location);
    })
    .done(null, next);
})

app.use(require('./lib/notes.js'));

var request = require('request');
var passport = require('passport');
var PersonaStrategy = require('passport-persona').Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var authed = express();

passport.serializeUser(function (user, done) {
  done(null, user.email);
});
passport.deserializeUser(function (email, done) {
  db.user(email).nodeify(done)
});

var audience = process.env.BROWSERID_AUDIENCE || 'http://localhost:3000';
passport.use(new PersonaStrategy({
    audience: audience
  },
  function (email, done) {
    db.user(email).nodeify(done)
  }
));
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '28627d32a6318f773fd3',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '6baddae5b8ea007f43f0312be1afc07eb2ea19d0',
  callbackURL: audience + '/auth/github/callback',
  scope: 'user:email'
}, function (accessToken, refreshToken, profile, done) {
  request({
    url: 'https://api.github.com/user/emails?access_token=' + accessToken,
    headers: { 'user-agent': 'esdiscuss.org', 'Accept': 'application/vnd.github.v3' }
  }, function (err, res) {
    if (err) return done(err)
    if (res.statusCode !== 200) return done(new Error('https://api.github.com/user/emails returned ' + res.statusCode + ' ' + res.body.toString()))
    var email
    try {
      email = JSON.parse(res.body.toString()).filter(function (e) { return e.primary && e.verified })[0]
      if (email) email = email.email
    } catch (ex) {
      return done(ex)
    }
    if (!email) return done(new Error('Your primary e-mail must be verified.'))
    db.user(email).nodeify(done)
  })
}))

authed.use(require('body-parser')())
authed.use(require('cookie-session')({
  keys: [process.env.COOKIE_SECRET || 'adfkasjast'],
  signed: true
}));
authed.use(passport.initialize());
authed.use(passport.session());

function requireAuth() {
  return function (req, res, next) {
    if (req.user) return next()
    res.render('login.jade', {url: req.url})
  }
}

authed.get('/auth/github', function (req, res, next) {
  req.session.url = req.query.url
  next()
}, passport.authenticate('github'))
authed.get('/auth/github/callback', function (req, res, next) {
  passport.authenticate('github', function(err, user, info) {
    if (err) return next(err)
    var url = req.session.url
    if ('url' in req.session) delete req.session.url
    if (!user) return res.redirect(url || '/')
    req.logIn(user, function(err) {
      if (err) return next(err)
      return res.redirect(url || '/')
    })
  })(req, res, next)
})
authed.post('/auth/persona', passport.authenticate('persona'), function (req, res) {
  res.send(true);
})
authed.post('/auth/logout', function (req, res, next) {
  req.logout();
  res.send(true);
})

app.get('/history/:id', function (req, res, next) {
  db.history(req.params.id)
    .then(function (history) {
      if (!history) return next()
      res.render('history.jade', {message: history, path: req.query.path})
    })
    .done(null, next)
})
var moderaters = [
  'andrew at lightcorp.net',
  'vince.falconi at gmail.com'
].map(function (u) { return u.replace(' at ', '@') })
authed.get('/edit/:id', requireAuth(), function (req, res, next) {
  db.message(req.params.id)
    .then(function (message) {
      if (!message) return next()
        if (moderaters.indexOf(req.user.email) != -1 || message.from.email === req.user.email) {
          res.render('edit.jade', {message: message, user: req.user, url: req.url})
        }
        else {
          res.statusCode = 403;
          return res.end('You cannot edit others messages.');
        }
    })
    .done(null, next)
})
authed.post('/edit/:id', function (req, res, next) {
  if (!req.user || !req.user.email) {
    res.statusCode = 403
    return res.end('Access Denied')
  }
  var edited = req.body.edited.replace(/\r/g, '')
  db.message(req.params.id)
    .then(function (message) {
      if (edited === message.edited.replace(/\r/g, '')) {
        return
      } else if (semantic(edited) === semantic(message.edited) || moderaters.indexOf(req.user.email) != -1){
        return db.update(req.params.id, edited, req.user.email)
      } else {
        throw new Error('Since this change is semantic, it requires moderation.')
      }
    })
    .then(function () {
      if (req.query.path) {
        res.redirect(req.query.path)
      } else {
        res.redirect(req.url)
      }
    })
    .done(null, next)
})

function semantic(a) {
  return a.replace(/\r/g, '').replace(/\n```js\n/gi, '').replace(/\n```javascript\n/gi, '').replace(/`/g, '').replace(/\s/g, '')
}

authed.locals = app.locals

app.use(authed)

var PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('listening on localhost:' + PORT);
