var pipermail = require('pipermail');
//var Q = require('q');
var join = require('path').join;

try {
  require('fs').mkdirSync(join(__dirname, 'archive'));
} catch (ex) {}
try {
  require('fs').mkdirSync(join(__dirname, 'bot'));
} catch (ex) {}

module.exports = updateArchive;
function updateArchive() {
  console.log('==upating archive==');
  var user = process.env.GITHUB_USER === 'undefined' ? undefined : process.env.GITHUB_USER;
  var pass = process.env.GITHUB_PASS === 'undefined' ? undefined : process.env.GITHUB_PASS;
  if (!(user && pass)) {
    throw new Error('You must provide both a username and a password');
  }

  /*
  var netrc = 'machine github.com\n' +
              'login ' + user + '\n' +
              'password ' + pass;
  require('fs').writeFileSync(join(__dirname, 'bot', '.netrc'), netrc);
  require('fs').writeFileSync(join(__dirname, 'bot', '_netrc'), netrc);
  process.env.HOME = join(__dirname, 'bot');
  */

  var stream = pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
      {progress: true, cache: true})
    .pipe(require('./lib/pipermail-filters').spam())
    .pipe(require('./lib/pipermail-filters').fixSubjects())
    .pipe(require('./lib/pipermail-filters').fixDates())
    .pipe(require('./lib/pipermail-output/using-api').outputToGitHub({
      user: {type: 'basic', username: user, password: pass},
      organisation: 'esdiscuss',
      team: '337802',
      stdio: 'inherit'//['ignore', 'ignore', 'ignore']
    }));
}

if(require.main === module) {
  process.env.GITHUB_USER = process.env.GITHUB_USER || process.argv[2];
  process.env.GITHUB_PASS = process.env.GITHUB_PASS || process.argv[3];
  updateArchive();
}