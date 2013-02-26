var pipermail = require('pipermail');
var Q = require('q');
var join = require('path').join;

try {
  require('fs').mkdirSync(join(__dirname, 'archive'));
} catch (ex) {}
try {
  require('fs').mkdirSync(join(__dirname, 'bot'));
} catch (ex) {}

module.exports = updateArchive;
function updateArchive() {
  var def = Q.defer();
  console.log('==upating archive==');
  var user = process.env.GITHUB_USER === 'undefined' ? undefined : process.env.GITHUB_USER;
  var pass = process.env.GITHUB_PASS === 'undefined' ? undefined : process.env.GITHUB_PASS;
  if (!(user && pass)) {
    throw new Error('You must provide both a username and a password');
  }

  var stream = pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
      {progress: false, cache: true})
    .pipe(require('./lib/pipermail-filters').spam())
    .pipe(require('./lib/pipermail-filters').fixSubjects())
    .pipe(require('./lib/pipermail-filters').fixDates())
    .pipe(require('./lib/pipermail-output/using-api').outputToGitHub({
      user: {type: 'basic', username: user, password: pass},
      organisation: 'esdiscuss',
      team: '337802'
    }));
  stream.on('error', def.reject.bind(def));
  stream.on('end', def.resolve.bind(def, null));
  return def.promise;
}

if(require.main === module) {
  process.env.GITHUB_USER = process.env.GITHUB_USER || process.argv[2];
  process.env.GITHUB_PASS = process.env.GITHUB_PASS || process.argv[3];
  updateArchive()
    .done(function () {
      console.log('Update Complete');
    }, function (err) {
      console.log('Update Failed');
      console.log();
      console.log(err.stack);
    })
}