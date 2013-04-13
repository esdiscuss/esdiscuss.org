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
var hljs = require('highlight.js');
var marked = require('marked');

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  highlight: function(code, lang) {
    try {
      if (lang) lang = lang.toLowerCase();
      if (lang === 'js' || lang === 'javascript') {
        return hljs.highlight('javascript', code).value;
      }
      if (lang === 'html') {
        return hljs.highlight('xml', code).value;
      }
    } catch (ex) {
      console.warn(ex.stack);
    } // if something goes wrong then
  }
});

var resolve = require('./lib/pipermail-resolve');
var db = require('./lib/database');

var app = express();

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.use(express.favicon(join(__dirname, 'favicon.ico')));
app.use('/static', express.static(join(__dirname, 'static')));
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development')
  app.use(express.logger('dev'));

browserify.settings.production('cache', '7 days');
app.get('/client.js', browserify('./client.js'));
app.get('/', function (req, res) {
  // 7 days
  res.setHeader('Cache-Control', 'public, max-age=' + (60 * 60 * 24 * 7));
  res.render('home', {});
});

app.get('/robots.txt', function (req, res) {
  res.end('User-agent: *\nDisallow: /source');
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



var notes = null;
function downloadNotes() {
  var res = Q(gethub('rwldrn', 'tc39-notes', 'master', join(__dirname, 'cache', 'notes')));
  notes = res;
  res.done(function () {
    setTimeout(function () {
      downloadNotes();
    }, ms('24 hours'));
  }, function () {
    notes = null;
  });
  return res;
}
function getNotes(year, month, day) {
  var n = notes || downloadNotes();
  return n
    .then(function () {
      return Q.nfbind(fs.readdir)(join(__dirname, 'cache', 'notes', 'es6', year + '-' + month));
    })
    .then(function (days) {
      var match = new RegExp('\\w+\\-' + day + '\\.md');
      for (var i = 0; i < days.length; i++) {
        if (match.test(days[i])) return days[i];
      }
      var err = new Error('Date not found');
      err.code = 'ENOENT';
      throw err;
    })
    .then(function (file) {
      return Q.nfbind(fs.readFile)(join(__dirname, 'cache', 'notes', 'es6', year + '-' + month, file), 'utf8');
    })
    .then(function(file) {
      return processNote(file);
    });
}

function processNote(content) {
  var meetingMembers = {
    JN: 'John Neumann',
    NL: 'Norbert Lindenberg',
    AWB: 'Wirfs-Brock',
    RW: 'Rick Waldron',
    WH: 'Waldemar Horwat',
    EF: 'Eric Ferraiuolo',
    EA: 'Erik Arvidsson',
    LH: 'Luke Hoban',
    MS: 'Matt Sweeney',
    DC: 'Doug Crockford',
    YK: 'Yehuda Katz',
    BE: 'Brendan Eich',
    STH: 'Sam Tobin-Hochstadt',
    AR: 'Alex Russell',
    DH: 'Dave Herman',
    AK: 'Adam Klein',
    EY: 'Edward Yang',
    DS: 'Dan Stefan',
    BM: 'Bernd Mathiske',
    JP: 'John Pampuch',
    AC: 'Avik Chaudhuri',
    EOC: 'Edward O\'Connor',
    RH: 'Rick Hudson',
    ARB: 'Andreas Rossberg',
    RWN: 'Rafeal Weinstein',
    MM: 'Mark Miller'
  };
  var lines = content.split('\n');
  lines = lines.map(function(line) {
    // Complete Name: "Brendan Eich:"
    line = line.replace(/^(\w+\s\w+)[\.:]/, function(match, p1, offset, string) {
      return '~~' + p1 + '~~';
    });
    // single: "AB:" or multiple: "AB/BC/CD:"
    var findShortNames = /^([A-Z]{2,3})(?:(?:, |\/)([A-Z]{2,3}))?(?:(?:, |\/)([A-Z]{2,3}))?[\.:]/;
    line = line.replace(findShortNames, function(match, p1, p2, p3, offset, string) {
      var members = [p1, p2, p3];
      var result = '~~';
      members.forEach(function(member, index) {
        var memberList = '';
        if (member) {
          if (index > 0) memberList += '/';
          memberList += meetingMembers[member] || member;
        }
        result += memberList;
      });
      result += '~~';
      return result;
    });
    return line;
  });
  return lines.join('\n');
}

app.get('/notes/:date', function (req, res, next) {
  var date = req.params.date.split('-');
  getNotes(date[0], date[1], date[2])
    .done(function (str) {
      res.render('notes', {date: req.params.date, content: marked(str)});
    }, function (err) {
      if (err && err.code === 'ENOENT') return next();
      else return next(err);
    });
})
app.get('/notes', function (req, res, next) {
  var n = notes || downloadNotes();
  n
    .then(function () {
      return Q.nfbind(fs.readdir)(join(__dirname, 'cache', 'notes', 'es6'));
    })
    .then(function (months) {
      return months
        .filter(function (m) { return /\d\d\d\d\-\d\d/.test(m); })
        .map(function (m) {
          return Q.nfbind(fs.readdir)(join(__dirname, 'cache', 'notes', 'es6', m))
            .then(function (days) {
              return {
                month: m,
                days: days.map(function (day) { return day.replace(/[^\d]+/g, '') })
              };
            });
        });
    })
    .all()
    .then(function (months) {
      res.render('notes-listing', {months: months});
    });
})

app.listen(3000);
console.log('listening on localhost:3000')