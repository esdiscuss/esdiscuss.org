var Q = require('q');
var moment = require('moment');
var crypto = require('crypto');
var querystring = require('querystring');
var mongojs = require('mongojs');
var db = mongojs('read:read@ds031617.mongolab.com:31617/esdiscuss', ['messages']);


exports.message = function (month, id) {
  return Q.promise(function (resolve, reject) {
    db.messages.find({_id: month + '/' + id}, function (err, res) {
      if (err) return reject(err);
      resolve(res[0] || null);
    });
  });
};
exports.fromDate = function (date) {
  return Q.promise(function (resolve, reject) {
    db.messages.find({date: date}, function (err, res) {
      if (err) return reject(err);
      resolve(res[0] || null);
    });
  });
};
exports.location = function (subjectID, date) {
  return Q.promise(function (resolve, reject) {
    db.messages.count(
      { 'subjectID': subjectID, 'date': {'$lt': date} },
      function (err, res) {
        if (err) return reject(err);
        return resolve({subjectID: subjectID, messageNum: res});
      });
  });
};

exports.topic = function (subjectID) {
  return Q.promise(function (resolve, reject) {
    db.messages.find({subjectID: subjectID}).sort({date: 1}, function (err, res) {
      if (err) return reject(err);
      res.forEach(function (message) {
        message.from.hash = crypto.createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
        message.from.avatar = avatar(message.from.hash);
        message.from.profile = profile(message.from.hash);
      })
      resolve(res);
    });
  });
};

function avatar(hash) {
  return 'https://secure.gravatar.com/avatar/' + hash + '?s=200&d=mm';
}
function profile(hash) {
  return 'http://www.gravatar.com/' + hash;
}

//sample topic
/*
[ { from: { email: 'nrubin@nvidia.com', name: 'Norm Rubin' },
    date: Fri Apr 05 2013 13:54:26 GMT+0100 (GMT Summer Time),
    subject: 'another rivertrail question',
    messageID: '<A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com>',
    _id: '2013-04/A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com',
    subjectID: 'anotherrivertrailquestion',
    month: '2013-04',
    id: 'A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com' },
  { from: { email: 'rick.hudson@intel.com', name: 'Hudson, Rick' },
    date: Fri Apr 05 2013 18:19:59 GMT+0100 (GMT Summer Time),
    subject: 'another rivertrail question',
    inReplyTo: '<A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com>',
    references: '<A4DCC42E2B5835498682FCB0A8F9F8733787065E70@HQMAIL04.nvidia.com>',
    messageID: '<7B9BA3214DBE2B42AE93AE882BD001960F41400F@fmsmsx110.amr.corp.intel.com>',
    _id: '2013-04/7B9BA3214DBE2B42AE93AE882BD001960F41400F@fmsmsx110.amr.corp.intel.com',
    subjectID: 'anotherrivertrailquestion',
    month: '2013-04',
    id: '7B9BA3214DBE2B42AE93AE882BD001960F41400F@fmsmsx110.amr.corp.intel.com' }]
*/

exports.page = function (page, numberPerPage) {
  numberPerPage = numberPerPage || 20;
  return Q.promise(function (resolve, reject) {
    db.messages.aggregate(
      { '$sort': { date: 1 } },
      {
        '$group': {
          _id: "$subjectID",
          subject: { '$first': '$subject'},
          messages: {'$sum': 1},
          first: { '$first': '$from' },
          last: { '$last': '$from' },
          start: { '$first': '$date' },
          end: { '$last': '$date' }
        }
      },
      { '$sort': {start: -1} },
      { '$skip': page * numberPerPage },
      { '$limit' : numberPerPage + 1 },
      function (err, res) {
        if (err) return reject(err);
        if (res.length < numberPerPage + 1) res.last = true;
        else res.pop();

        res.forEach(function (topic) {
          topic.start = moment(topic.start);
          topic.end = moment(topic.end);
        });
        return resolve(res);
      });
    });
};

//sample page
/*
[ { _id: 'anotherrivertrailquestion',
    subject: 'another rivertrail question',
    messages: 2,
    first: { email: 'nrubin@nvidia.com', name: 'Norm Rubin' },
    last: { email: 'rick.hudson@intel.com', name: 'Hudson, Rick' },
    start: Fri Apr 05 2013 13:54:26 GMT+0100 (GMT Summer Time),
    end: Fri Apr 05 2013 18:19:59 GMT+0100 (GMT Summer Time) },
  { _id: 'howtosubmitaproposalfocmascript',
    subject: 'how to submit a proposal for ECMAScript 7?',
    messages: 2,
    first: { email: 'ohad.assulin@hp.com', name: 'Assulin, Ohad' },
    last: { email: 'bruant.d@gmail.com', name: 'David Bruant' },
    start: Fri Apr 05 2013 11:00:10 GMT+0100 (GMT Summer Time),
    end: Fri Apr 05 2013 11:27:37 GMT+0100 (GMT Summer Time) },

  last: false
]
*/

