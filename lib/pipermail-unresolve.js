var database = require('./database');

module.exports = resolve;
function resolve(month, id) {
  return database.fromURL('https://mail.mozilla.org/pipermail/es-discuss/' + month + '/' + id + '.html')
    .then(function (message) {
      if (!message) return null;
      var subjectID = message.subjectID;
      var date = message.date;
      return database.location(subjectID, date);
    })
    .then(function (location) {
      if (!location) return null;
      return '/topic/' + location.subjectID + '#content-' + location.messageNum;
    });
}