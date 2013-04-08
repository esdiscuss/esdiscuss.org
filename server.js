var jade = require('jade');
var express = require('express');
var moment = require('moment');
var request = require('hyperquest');
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

app.get('/topic/:id', function (req, res, next) {
  db.topic(req.params.id)
    .done(function (topic) {
      if (topic.length === 0) return next();
      app.render('topic', {
        topic: topic[0],
        messages: topic
      }, function (err, str) {
        if (err) return next(err);

        str = str.split('<stream>');
        var i = 0;
        function nxt() {
          res.write(str[i]);
          if (str.length === ++i) return res.end();
          var path;
          str[i] = str[i].replace(/^((?:[^\<]|\n|\r)+)\<\/stream\>/g, function (_, p) {
            path = p;
            return '';
          });
          var req = request('https://raw.github.com/esdiscuss/' + path.trim());
          req.pipe(escapeStream()).pipe(res, { end: false });
          req.on('end', nxt);
        }
        nxt();
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