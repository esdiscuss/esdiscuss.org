var database = require('./database');

module.exports = resolve;
function resolve(month, id) {
  return database.fromURL('https://mail.mozilla.org/pipermail/es-discuss/' + month + '/' + id + '.html')
    .then(function (message) {
      var subjectID = message.subjectID;
      var date = message.date;
      return database.location(subjectID, date);
    })
    .then(function (location) {
      return '/topic/' + location.subjectID + '#content-' + location.messageNum;
    });
}