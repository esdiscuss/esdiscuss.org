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
app.use('/static', express.static(join(__dirname, 'static')));
app.use(express.logger('dev'));

browserify.settings.production('cache', '7 days');
app.get('/client.js', browserify('./client.js'));
app.get('/', function (req, res) {
  // 7 days
  res.setHeader('Cache-Control', 'public, max-age=' + (60 * 60 * 24 * 7));
  res.render('home', {});
});

app.get('/:page', function (req, res, next) {
  if (!/^\d+$/.test(req.params.page)) return next();
  // 30 minutes
  res.setHeader('Cache-Control', 'public, max-age=' + (60 * 30));

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
function isRecent(month) {
  var year = +(month.split('-')[0]);
  var mth = +(month.split('-')[1]);
  var now = new Date();
  return now - new Date(year, mth - 1) < ms('45 days');
}
var months = {};
function downloadMonth(month) {
  var res = Q(gethub('esdiscuss', month, 'master', join(__dirname, 'cache', month)));
  months[month] = res;
  res.done(function () {
    setTimeout(function () {
      downloadMonth(month);
    }, isRecent(month) ? ms('30 minutes') : ms('24 hours'));
  }, function () {
    months[month] = null;
  });
  return res;
}
function get(month, id, part) {
  var m = months[month] || downloadMonth(month);
  return m.then(function () {
    return Q.nfbind(fs.readFile)(join(__dirname, 'cache', month, id, part), 'utf8')
      .then(null, function (err) {
        console.warn(err.stack || err.message || err);
        return 'Message Not Found: Please allow 30 minutes for new messages to arrive and the cache to clear.';
      });
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
      var someRecent = topic.some(function (msg) { return isRecent(msg.month); });
      // 30 minutes or 12 hours
      res.setHeader('Cache-Control', 'public, max-age=' + (someRecent ? 60 * 30 : 60 * 60 * 12));
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