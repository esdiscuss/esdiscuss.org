var pipermail = require('pipermail');
//var Q = require('q');
var join = require('path').join;

function updateArchive() {
  if (!(process.env.GITHUB_USER && process.env.GITHUB_PASS)) {
    throw new Error('You must provide both a username and a password');
  }
  var netrc = 'machine github.com\n' +
              'login ' + process.env.GITHUB_USER + '\n' +
              'password ' + process.env.GITHUB_PASS;
  require('fs').writeFileSync(join(__dirname, '.netrc'), netrc);
  require('fs').writeFileSync(join(__dirname, '_netrc'), netrc);
  var stream = pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
      {progress: true, cache: true})
    .pipe(require('./lib/pipermail-filters').spam())
    .pipe(require('./lib/pipermail-filters').fixSubjects())
    .pipe(require('./lib/pipermail-filters').fixDates())
    .pipe(require('./lib/pipermail-output').outputToDir(join(__dirname, 'archive'),
      {
        user: {type: 'basic', username: process.env.GITHUB_USER, password: process.env.GITHUB_PASS},
        organisation: 'esdiscuss',
        team: '337802'
      }));
}

updateArchive();