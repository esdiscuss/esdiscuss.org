var Q = require('q');
var moment = require('moment');
var crypto = require('crypto');
var querystring = require('querystring');
var mongojs = require('mongojs');
var user = process.env.MONGO_USER || 'read'
var pass = process.env.MONGO_PASS || 'read'
var db = mongojs(user + ':' + pass + '@ds031617.mongolab.com:31617/esdiscuss', ['topics', 'headers', 'contents', 'history']);
var processMessage = require('./process').processMessage

exports.user = function (email) {
  var hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  var user = {
    email: email,
    hash: hash,
    avatar: avatar(hash),
    profile: profile(hash)
  }
  return Q(user)
}
exports.message = function (id) {
  var header = Q.promise(function (resolve, reject) {
    db.headers.findOne({_id: id}, function (err, res) {
      if (err) return reject(err);
      else return resolve(res)
    })
  })
  var content = Q.promise(function (resolve, reject) {
    db.contents.findOne({_id: id}, function (err, res) {
      if (err) return reject(err);
      else return resolve(res)
    })
  })
  return Q.all([header, content]).spread(function (message, content) {
    if (!message) return null
    message.from.hash = crypto.createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
    message.from.avatar = avatar(message.from.hash);
    message.from.profile = profile(message.from.hash);
    message.edited = content.edited || processMessage(content.content)
    message.original = content.content
    return message
  });
};
exports.update = function (id, content, email) {
  var now = new Date()
  return Q.promise(function (resolve, reject) {
    db.history.insert({_id: now.toISOString(), id: id, date: now, user: email, content: content}, {safe: true}, function (err, res) {
      if (err) return reject(err)
      else return resolve(res)
    })
  })
  .then(function () {
    var contentUpdated = Q.promise(function (resolve, reject) {
      db.contents.update({_id: id}, {'$set': { updated: now, edited: content } }, function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
    })
    var headerUpdated = Q.promise(function (resolve, reject) {
      db.headers.update({_id: id}, {'$set': { updated: now } }, function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
    })
    return Q.all([contentUpdated, headerUpdated])
  })
};
exports.history = function (id) {
  var now = new Date()
  var original = exports.message(id)
  var edits = Q.all(Q.promise(function (resolve, reject) {
    db.history.find({id: id}).sort({'date':1}, function (err, res) {
      if (err) return reject(err)
      else return resolve(res)
    })
  })
  .then(function (edits) {
    return edits.map(function (e) {
      return exports.user(e.user)
        .then(function (user) {
          e.from = user
          return e
        })
    })
  }))
  return Q.all([original, edits])
    .then(function (args) {
      return {
        original: args[0],
        edits: args[1]
      }
    })
};
exports.fromURL = function (url) {
  return Q.promise(function (resolve, reject) {
    db.headers.find({url: url}, function (err, res) {
      if (err) return reject(err);
      resolve(res[0] || null);
    });
  })
};
exports.location = function (subjectID, date) {
  var path = Q.promise(function (resolve, reject) {
    db.topics.findOne({subjectID: subjectID}, function (err, res) {
      if (err) return reject(err);
      else return resolve(res._id);
    });
  });
  var messageNum = Q.promise(function (resolve, reject) {
    db.headers.count(
      { 'subjectID': subjectID, 'date': {'$lt': date} },
      function (err, res) {
        if (err) return reject(err);
        return resolve(res);
      });
  });
  return Q.all([path, messageNum])
          .spread(function (path, messageNum) {
            return {subjectID: path, messageNum: messageNum}
          })
};

exports.topic = function (subjectID) {
  return Q.promise(function (resolve, reject) {
      db.topics.findOne({_id: subjectID}, function (err, res) {
        if (err) return reject(err)
        else return resolve(res)
      })
    })
    .then(function (res) {
      var headers = Q.promise(function (resolve, reject) {
        db.headers.find({subjectID: res ? res.subjectID : subjectID}).sort({date: 1}, function (err, res) {
          if (err) return reject(err);
          else return resolve(res)
        })
      })
      var contents = Q.promise(function (resolve, reject) {
        db.contents.find({subjectID: res ? res.subjectID : subjectID}, function (err, res) {
          if (err) return reject(err);
          else return resolve(res)
        })
      })
      return Q.all([headers, contents]).spread(function (headers, contents) {
        headers.forEach(function (message) {
          message.from.hash = crypto.createHash('md5').update(message.from.email.toLowerCase().trim()).digest('hex');
          message.from.avatar = avatar(message.from.hash);
          message.from.profile = profile(message.from.hash);
          var c = contents.filter(function (m) { return m._id === message._id })[0]
          message.edited = c.edited || processMessage(c.content)
          message.original = c.content
          message.updated = message.updated || c.updated
        })
        return headers
      });
    })
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
    db.topics.aggregate(
      { '$sort': {end: -1} },
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
    })
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

