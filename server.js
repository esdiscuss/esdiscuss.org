var jade = require('jade');
var express = require('express');
var moment = require('moment');
var Q = require('q');
var request = require('hyperquest');
var concat = require('concat-stream');
var browserify = require('browserify-middleware');
var join = require('path').join;

var resolve = require('./lib/pipermail-resolve');
var db = require('./lib/database');
var escapeStream = require('./lib/escape-stream');

var PAGE_SIZE = 20;

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

function get(path) {
  return Q.promise(function (resolve, reject) {
    request(path, {}, function (err, res) {
      if (err) return reject(err);
      if (res.statusCode != 200) return reject(new Error('Status code ' + res.statusCode));
    })
    .pipe(concat(function (err, res) {
      if (err) return reject(err);
      if (res) resolve(res.toString('utf8'))
    }))
  });
}
app.get('/topic/:id', function (req, res, next) {
  db.topic(req.params.id)
    .then(function (topic) {
      var tasks = [];
      topic.forEach(function (message) {
        var base = 'https://raw.github.com/esdiscuss/' + message.month + '/master/' + encodeURIComponent(message.id);
        tasks.push(get(base + '/edited.md')
          .then(function (val) {
            message.edited = val;
          }));
        tasks.push(get(base + '/original.md')
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