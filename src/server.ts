import 'dotenv/config';
import {join} from 'path';
import express from 'express';
import moment from 'moment';
import ms from 'ms';
import {promises as fs} from 'fs'

import './search';
import * as db from './database';
import { renderMessage } from './process';
import pipermailUnresolve from './pipermail-unresolve';
// import notesApp from './notes';
import View from './view-engine'

var prepare = require('prepare-response');

var version = require('../package.json').version;

var app = express();

app.locals.asset = function (path: string) {
  return '/static/' + version + path
}
app.set('view', View);

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

function getCachedFileResponse(name: string) {
  const response = fs.readFile(name).then((body) => prepare(body, {
    'content-type': name.split(`.`).pop()!,
    'cache-control': process.env.NODE_ENV === 'production' ? '1 hour' : '1 second',
  }));
  return (req: any, res: any, next: any) => {
    response.then(function (response: any) {
      response.send(req, res, next);
    }, next);
  }
}
app.get(staticPath('client/listing.js'), getCachedFileResponse('./build/client/listing.js'));
app.get(staticPath('client/topic.js'), getCachedFileResponse('./build/client/topic.js'));
app.get(staticPath('client/edit.js'), getCachedFileResponse('./build/client/edit.js'));
app.get(staticPath('client/login.js'), getCachedFileResponse('./build/client/login.js'));
app.get(staticPath('style.css'), getCachedFileResponse('./build/style.css'));

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

// TODO: it would be nice to fix the "notes" app. Unfortunately GitHub's API broke, so it no longer works
// app.use(notesApp);
app.use('/notes', (_req, res) => {
  res.redirect(`https://github.com/rwaldron/tc39-notes`)
})

app.get('/history/:id', function (req, res, next) {
  db.history(req.params.id as db.MessageKey)
    .then(function (history) {
      if (!history) return next()
      res.render('history', {message: history, path: req.query.path})
    })
    .catch(next)
})

var PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('listening on localhost:' + PORT);
