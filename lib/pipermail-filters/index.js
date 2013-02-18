var through = require('through');

exports.spam = spam;
function spam() {
  return through(function (item) {
    if (!/spam/i.test(item.header.subject) &&
        !/no subject/i.test(item.header.subject)) {
      this.queue(item);
    }
  });
}

exports.fixSubjects = fixSubjects;
function fixSubjects() {
  var subjects = {};
  var convoIDs = {};
  return through(function (item) {
    item.header.subject =
      (convoIDs[item.header.messageID] =
      convoIDs[item.header.inReplyTo] ||
      subjects[tag(item.header.subject)] ||
      (subjects[tag(item.header.subject)] = item.header.subject));
    this.queue(item);
  });
  function tag(subject) {
    return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '');
  }
}

exports.fixDates = fixDates;
function fixDates() {
  return through(function (item) {
    item.header.date = new Date(item.header.date);
    this.queue(item);
  });
}

exports.selectSubject = selectSubject;
function selectSubject() {
  return through(function (item) {
    this.queue([item.header.messageID, item.header.subject]);
  });
}
