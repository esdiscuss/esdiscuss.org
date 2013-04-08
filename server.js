var jade = require('jade');
var express = require('express');
var moment = require('moment');
var Q = require('q');
var fs = require('fs');
var request = require('hyperquest');
var concat = require('concat-stream');
var browserify = require('browserify-middleware');
var join = require('path').join;
var gethub = require('gethub');
var ms = require('ms');

var resolve = require('./lib/pipermail-resolve');
var db = require('./lib/database');
var escapeStream = require('./lib/escape-stream');

var app = express();

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(express.favicon(join(__dirname, 'favicon.ico')));
app.use(express.logger('dev'));

app.get('/client.js', browserify('./client.js'));
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

var months = {};
function downloadMonth(month) {
  var res = Q(gethub('esdiscuss', month, 'master', join(__dirname, 'cache', month)));
  months[month] = res;
  res.done(function () {
    setTimeout(function () {
      months[month] = null;
    }, ms('24 hours'));
  }, function () {
    months[month] = null;
  });
  return res;
}
function get(month, id, part) {
  var m = months[month] || downloadMonth(month);
  return m.then(function () {
    return Q.nfbind(fs.readFile)(join(__dirname, 'cache', month, id, part), 'utf8');
  });
}
app.get('/topic/:id', function (req, res, next) {
  db.topic(req.params.id)
    .then(function (topic) {
      var tasks = [];
      topic.forEach(function (message) {
        var base = 'https://raw.github.com/esdiscuss/' + message.month + '/master/' + encodeURIComponent(message.id);
        tasks.push(get(message.month, message.id, '/edited.md')
          .then(function (val) {
            message.edited = val;
          }));
        tasks.push(get(message.month, message.id, '/original.md')
          .then(function (val) {
            message.original = val;
          }));
      });
      return Q.all(tasks).thenResolve(topic);
    })
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

app.listen(3000);
console.log('listening on localhost:3000')