var express = require('express');
var moment = require('moment');
var request = require('request');
var transform = require('transform');
var join = require('path').join;
var resolve = require('./lib/pipermail-resolve');
var db = require('./lib/database');

var PAGE_SIZE = 20;

var app = express();

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(express.favicon(join(__dirname, 'favicon.ico')));
app.use(express.logger('dev'));
app.use(transform(__dirname + '/client')
  .using(function (tr) {
    tr.add('component.json', 'build/build.js', 'component');
  })
  .grep(/^[^\/]*\/?component\.json$/)
  .to(__dirname + '/client'));


app.get('/', function (req, res) {
  res.render('home', {});
});

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
      res.render('topic', {
        topic: topic[0],
        messages: topic
      });
    }, next);
});
app.get('/source/:date', function (req, res, next) {
  resolve(req.params.date, function (err, url) {
    if (err && err.code === 'ENOENT') return next();
    if (err) return next(err);
    res.redirect(301, url);
  })
});

app.get('/:repo/:messageID/:part', function (req, res, next) {
  var repo = req.params.repo;
  var mess = req.params.messageID;
  var part = req.params.part;
  if (!/\d\d\d\d\-\d\d/.test(req.params.repo)) return next();
  if (['edited.md', 'header.json', 'original.md'].indexOf(part) === -1) return next();
  request('https://raw.github.com/esdiscuss/' + repo + '/master/' + encodeURIComponent(mess) + '/' + part)
    .pipe(res);
});


app.listen(3000);
console.log('listening on localhost:3000')