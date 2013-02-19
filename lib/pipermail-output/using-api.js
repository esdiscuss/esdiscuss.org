var join = require('path').join;
var fs = require('fs');
var transform = require('transform-stream');
var through = require('through');
var GitHub = new require('./github');
var request = require('request');

//require('github/util').log = function () {};

exports.outputToGitHub = outputToGitHub;
function outputToGitHub(settings) {
  var client = new GitHub(settings);
  var commits = {};
  var commitsToPush = [];
  return through(function (item) {
    var self = this;
    self.pause();
    var date = normaliseDate(item.header.date);
    if (date !== '2013-02') return self.resume();
    var messageID = item.header.messageID.replace(/\</g, '').replace(/\>/g, '');
    //console.log(date + '/' + messageID);
    client.createRepo(date)
      .then(function () {
        return client.exists(date, messageID);
      })
      .then(function (exists) {
        if (exists) return;
        console.log(date + '/' + messageID + ' -> does not exist');
        var commit = commits[date];
        if (!commit) {
          commit = commits[date] = client.createCommit(date);
          commitsToPush.push(commit);
        }

        return commit.addFiles([
          {
            path: messageID + '/header.json',
            content: JSON.stringify(item.header, null, 2)
          },
          {
            path: messageID + '/original.md',
            content: item.body
          },
          {
            path: messageID + '/edited.md',
            content: item.body
          }]);
      })
      .timeout(40000)
      .done(function () {
        self.resume();
      }, function (err) {
        console.error(err.stack || err.message || err);
        self.resume();
      });
  }, function (finish) {
    var current = require('Q').resolve(null);
    commitsToPush.forEach(function (commit) {
      current = current.then(function () {
        return commit.complete('Add Messages');
      });
    });
    var self = this;
    current
      .done(function () {
        self.queue(null);
      }, function (err) {
        console.error(err.stack || err.message || err);
        self.queue(null);
      });
  }, true);
}

function normaliseDate(date) {
  var month = '' + (date.getMonth() + 1);
  if (month.length === 1) month = '0' + month;
  return date.getFullYear() + '-' + month;
}