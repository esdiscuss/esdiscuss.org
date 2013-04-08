var Q = require('q');
var moment = require('moment');
var mongojs = require('mongojs');
var db = mongojs('read:read@ds031617.mongolab.com:31617/esdiscuss', ['messages']);

exports.topic = function (subjectID) {
  return Q.promise(function (resolve, reject) {
    db.messages.find({subjectID: subjectID}).sort({date: 1}, function (err, res) {
      if (err) return reject(err);
      else return resolve(res);
    });
  });
};

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

