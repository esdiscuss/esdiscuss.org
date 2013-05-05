var hyperquest = require('hyperquest');
var concat = require('concat-stream');
var moment = require('moment');
var Q = require('q');
var database = require('./database');

function request(url, cb) {
  var err, res;
  return Q.promise(function (resolve, reject) {
    var strm = hyperquest(url, {}, function (err, res) {
      if (err) return reject(err);
      strm.pipe(concat(function (err, body) {
        if (err) return reject(err);
        res.body = body;
        resolve(res);
      }));
    });
  })
}

module.exports = resolve;
function resolve(month, id) {
  return request('https://mail.mozilla.org/pipermail/es-discuss/' + month + '/' + id + '.html')
    .then(function (res) {
      if (res.statusCode !== 200) throw new Error('server status code: ' + res.statusCode);
      var date = /<i> *(\w\w\w +\w\w\w +\d?\d +\d\d:\d\d:\d\d +\w\w\w+ +\d\d\d\d) *<\/i>/i
          .exec(res.body.toString())[1];
      return database.fromDate(new Date(date));
    })
    .then(function (message) {
      var subjectID = message.subjectID;
      var date = message.date;
      return database.location(subjectID, date);
    })
    .then(function (location) {
      return '/topic/' + location.subjectID + '#content-' + location.messageNum;
    });
}