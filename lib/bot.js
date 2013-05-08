var bot = require('pipermail-bot');
var ms = require('ms');

exports.run = run;

function run() {
  if (!process.env.ES_PASS) {
    console.warn('process.env.ES_PASS was not set!');
    return;
  }
  setTimeout(run, ms('30m'));
  console.log('run start: ' + (new Date).toISOString());
  var stream = bot({
    source: 'https://mail.mozilla.org/pipermail/es-discuss/',
    age: '1d',
    organisation: 'esdiscuss',
    team: '337802',
    user: 'esdiscuss-bot',
    pass: process.env.ES_PASS,
    db: 'bot:' + process.env.ES_PASS + '@ds031617.mongolab.com:31617/esdiscuss'
  });
  stream.on('data', function (message) {
    console.dir(message.header);
  });
  stream.on('error', function (ex) {
    console.error(ex.stack || ex.message || ex);
  });
  stream.on('end', function () {
    console.log('run end: ' + (new Date).toISOString());
  });
};