var pipermail = require('pipermail');
var express = require('express');
var moment = require('moment');
var request = require('request');
var transform = require('transform');
var join = require('path').join;
var resolve = require('./lib/pipermail-resolve');

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

var topics = JSON.parse(require('fs').readFileSync(
    join(__dirname, 'topics-cache', 'topics.json')
  ).toString()).map(function (item) {
    item.start = moment(item.start);
    item.end = moment(item.end);
    return item;
  });

app.get('/', function (req, res) {
  res.render('home', {});
});

app.get('/:page', function (req, res, next) {
  if (!/^\d+$/.test(req.params.page)) return next();
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
  if (topic) {
    res.render('topic', {
      topic: topic,
      messages: require('fs').readFileSync(join(__dirname, 'topics-cache', 'topics', (index + 1) + '.txt')).toString().split('\n')
    })
  } else {
    next();
  }
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

function updateTopics() {
  console.log('==updating topics==');

  var transform = require('transform-stream');
  var fs = require('fs');
  try {
    fs.mkdirSync(join(__dirname, 'archive'));
  } catch (ex) {
    if (ex.code !== 'EEXIST') throw ex;
  }
  try {
    fs.mkdirSync(join(__dirname, 'topics-cache', 'topics'));
  } catch (ex) {
    if (ex.code !== 'EEXIST') throw ex;
  }
  var bySubject = {};
  var _topics = [];
  var index = 1;
  var stream = pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
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
        //bySubject['sub:' + head.subject].messages.push(id);
        bySubject['sub:' + head.subject].end = (new Date(head.date)).getTime();
        fs.appendFileSync(join(__dirname, 'topics-cache', 'topics', bySubject['sub:' + head.subject].id + '.txt'), '\n' + id);
      } else {
        fs.writeFileSync(join(__dirname, 'topics-cache', 'topics', index + '.txt'), id);
        _topics.push(bySubject['sub:' + head.subject]  = {
          id: index++,
          subject: head.subject,
          from: head.from.email,
          start: (new Date(head.date)).getTime(),
          //messages: [id],
          end: (new Date(head.date)).getTime()
        });
      }
      finish();
    }, function (finish) {
      topics = _topics.map(function (item) {
        item = Object.create(item);
        item.start = moment(item.start);
        item.end = moment(item.end);
        return item;
      });
      fs.writeFileSync(join(__dirname, 'topics-cache', 'topics.json'),
        JSON.stringify(_topics, null, 2));

      console.log('==updated topics==');
      finish();
    }));
  stream.on('error', function (e) {
    console.error(e.stack || e.message || e);
  });
}

setTimeout(function () {
  updateTopics();
  setInterval(updateTopics, 600000);
}, 300000);

var updateArchive = require('./update-archive.js');

if (process.env.GITHUB_USER && process.env.GITHUB_PASS) {
  console.log('==GOT GITHUB USER==')
  function doUpdateArchive() {
    updateArchive()
      .fail(function (err) {
        console.error(err.stack || err.message || err);
      })
      .delay(300000)
      .done(function () {
        doUpdateArchive();
      });
  }
  doUpdateArchive();
} else {
  console.log('==NO GITHUB USER==');
  updateTopics();
}