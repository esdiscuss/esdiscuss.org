var pipermail = require('pipermail');
var express = require('express');
var moment = require('moment');
var request = require('request');
var transform = require('transform');
var join = require('path').join;

var PAGE_SIZE = 20;

var app = express();

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(express.logger('dev'));
app.use(transform(__dirname + '/client')
  .using(function (tr) {
    tr.add('component.json', 'build/build.js', 'component');
  })
  .grep(/^component\.json$/)
  .to(__dirname + '/client'));

var topics = [];

app.get('/', function (req, res) {
  res.render('home', {});
});

app.get('/:page', function (req, res, next) {
  var page = req.params.page - 1;
  if (page < 0) return next();
  if (page * PAGE_SIZE >= topics.length) return next();
  res.render('listing', {
    last: (page + 1) * PAGE_SIZE >= topics.length,
    id: page + 1,
    topics: topics.reverse().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  });
  topics.reverse();
});

app.get('/topic/:id', function (req, res, next) {
  var index = req.params.id - 1;
  var topic = topics[index];
  res.render('topic', {
    topic: topic
  })
});

app.get('/:repo/:messageID/:part', function (req, res, next) {
  var repo = req.params.repo;
  var mess = req.params.messageID;
  var part = req.params.part;
  if (!/\d\d\d\d\-\d\d/.test(req.params.repo)) return next();
  if (['edited.md', 'header.json', 'original.md'].indexOf(part) === -1) return next();
  request('https://raw.github.com/esdiscuss/' + repo + '/master/' + mess + '/' + part)
    .pipe(res);
});

app.listen(3000);

function updateTopics() {
  console.log('==updating topics==');

  var transform = require('transform-stream');
  var fs = require('fs');

  var bySubject = {};
  var _topics = [];
  var index = 1;
  pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
      {progress: false, cache: true})
    .pipe(require('./lib/pipermail-filters').spam())
    .pipe(require('./lib/pipermail-filters').fixSubjects())
    .pipe(require('./lib/pipermail-filters').fixDates())
    .pipe(transform(function (item, finish) {
      var head = item.header;
      var year = (new Date(head.date)).getFullYear();
      var month = '' + ((new Date(head.date)).getMonth() + 1);
      if (month.length === 1) month = '0' + month;
      var id = year + '-' + month + '/' + head.messageID
        .replace(/</g, '')
        .replace(/>/g, '');
      if (bySubject['sub:' + head.subject]) {
        bySubject['sub:' + head.subject].messages.push(id);
        bySubject['sub:' + head.subject].end = (new Date(head.date)).getTime();
      } else {
        _topics.push(bySubject['sub:' + head.subject]  = {
          id: index++,
          subject: head.subject,
          from: head.from.email,
          start: (new Date(head.date)).getTime(),
          end: (new Date(head.date)).getTime(),
          messages: [id]
        })
      }
      finish();
    }, function (finish) {
      topics = _topics.map(function (item) {
        item = Object.create(item);
        item.start = moment(item.start);
        item.end = moment(item.end);
        return item;
      });
      fs.writeFileSync(join(__dirname, 'archive', 'topics.json'),
        JSON.stringify(_topics.reverse(), null, 2));

      finish();
    }));
}

updateTopics();
setInterval(updateTopics, 1200000);

var updateArchive = require('./update-archive');
if (process.env.GITHUB_USER && process.env.GITHUB_PASS) {
  updateArchive();
  setInterval(updateArchive, 1200000);
}