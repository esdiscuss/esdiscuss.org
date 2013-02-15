var transform = require('transform-stream');

exports.spam = spam;
function spam() {
  return transform(function (item, finish) {
    if (/spam/i.test(item.header.subject)) finish();
    else if (/no subject/i.test(item.header.subject)) finish();
    else finish(null, item);
  });
}

exports.fixSubjects = fixSubjects;
function fixSubjects() {
  var subjects = {};
  var convoIDs = {};
  return transform(function (item, finish) {
    item.header.subject =
      (convoIDs[item.header.messageID] =
      convoIDs[item.header.inReplyTo] ||
      subjects[tag(item.header.subject)] ||
      (subjects[tag(item.header.subject)] = item.header.subject));
    finish(null, item);
  });
  function tag(subject) {
    return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '');
  }
}

exports.fixDates = fixDates;
function fixDates() {
  return transform(function (item, finish) {
    item.header.date = new Date(item.header.date);
    finish(null, item);
  });
}

exports.selectSubject = selectSubject;
function selectSubject() {
  return transform(function (item, finish) {
    finish(null, [item.header.messageID, item.header.subject]);
  });
}
