var hyperquest = require('hyperquest');
var concat = require('concat-stream');
var moment = require('moment');
var Q = require('q');

function request(url, cb) {
  var err, res;
  var strm = hyperquest(url, {}, function (err, res) {
    if (err) return cb(err);
    strm.pipe(concat(function (err, body) {
      res.body = body;
      cb(err, res, body);
    }))
  });
}



var debug = console.log;

module.exports = resolve;
function resolve(date, cb) {
  if (!(date instanceof Date)) date = new Date(date);
  debug('searching for ' + format(date));
  readPage(date, function (err, files) {
    if (err) return cb(err);
    files = files.map(function (file) {
      return 'https://mail.mozilla.org/pipermail/es-discuss/'
        + moment(date).format('YYYY-MMMM')
        + '/' + file;
    });
    asyncBinarySearch(files, comparison(date), function (err, res) {
      if (err) return cb(err);
      else return cb(null, files[res]);
    });
  });
}

function format(date) {
  return moment(date).format('Do MMMM YYYY HH:mm:ss')
}

function readPage(date, callback) {
  try {
    var url = 'https://mail.mozilla.org/pipermail/es-discuss/'
      + moment(date).format('YYYY-MMMM')
      + '/date.html';
    request(url, function (err, res) {
      if (err) return callback(err);
      if (res.statusCode !== 200)
        return callback(new Error('server status code: ' + res.statusCode));
      var matches = [];
      var body = res.body.toString();
      var match;
      var pattern = /<a[^\>]+href\=\"(\d+\.html)\"/gi;
      while (match = pattern.exec(body)) {
        matches.push(match[1]);
      }
      callback(null, matches);
    });
  } catch (ex) {
    return callback(ex);
  }
}

function comparison(searchingFor) {
  return function (file, callback) {
    try {
      request(file, function (err, res) {
        if (err) return callback(err);
        if (res.statusCode !== 200)
          return callback(new Error('server status code: ' + res.statusCode));
        var date = /<i> *(\w\w\w +\w\w\w +\d?\d +\d\d:\d\d:\d\d +\w\w\w+ +\d\d\d\d) *<\/i>/i
        .exec(res.body.toString())[1];
        date = new Date(date);
        debug('Examining ' + file.replace(/[^0-9]+/g, '') + ': ' + format(date));
        if (date < searchingFor) return callback(null, 1);
        else if (date > searchingFor) return callback(null, -1);
        else return callback(null, 0);
      })
    } catch (ex) {
      return callback(ex);
    }
  }
}

function asyncBinarySearch(array, comparison, callback) {
  var start = 0;
  var length = array.length;
  var notFound = new Error('Item not found');
  notFound.code = 'ENOENT';
  function step() {
    if (length === 0) return callback(notFound);
    var mid = start + Math.floor(length / 2);
    comparison(array[mid], function (err, res) {
      if (err) return callback(err);
      if (res === 0) return callback(null, mid);
      if (res === 1) start = mid + 1;
      if (length === 1) length--;
      else length = Math.ceil(length / 2);
      return step();
    });
  }
  step();
}
