var join = require('path').join;
var fs = require('fs');
var transform = require('transform-stream');
var GitHub = new require('github');
var spawn = require('win-spawn');

require('github/util').log = function () {};

var cloneCMD = 'git clone git@github.com:[user]/[repo].git';

exports.outputToDir = outputToDir;
function outputToDir(dir, github) {
  var folders = [];
  var modified = {};
  var pendingFolders = {};
  return transform(function (item, finish) {
    var date = normaliseDate(item.header.date);
    if (pendingFolders[date] === true) {
      process.nextTick(next);
    } else if (Array.isArray(pendingFolders[date])) {
      pendingFolders[date].push(next);
    } else {
      pendingFolders[date] = [next];
      folders.push(date);
      cloneFolder(dir, date, github, function (err) {
        if (err) throw err;
        var p = pendingFolders[date];
        pendingFolders[date] = true;
        for (var i = 0; i < p.length; i++) {
          p[i]();
        }
      });
    }
    function next() {
      //console.log(join(date, item.header.messageID.replace(/\</g, '').replace(/\>/g, '')));
      var path = join(dir, date, item.header.messageID.replace(/\</g, '').replace(/\>/g, ''));//'' + (i++));
      var remaining = 3;
      try {
        require('fs').mkdirSync(path);
      } catch (ex) {
        if (ex.code !== 'EEXIST') throw ex;
      }
      //if (err) return finish(err);
      try {
        fs.statSync(join(path, 'header.json'));
      } catch (ex) {
        modified[date] = true;
        require('fs').writeFileSync(join(path, 'header.json'),
          JSON.stringify(item.header, null, 2));
      }
      try {
        fs.statSync(join(path, 'original.md'));
      } catch (ex) {
        modified[date] = true;
        require('fs').writeFileSync(join(path, 'original.md'), item.body);
      }
      try {
        fs.statSync(join(path, 'edited.md'));
      } catch (ex) {
        modified[date] = true;
        fs.writeFileSync(join(path, 'edited.md'), item.body);
      }
      finish(null);
    }
  }, function (finish) {
    function next(i) {
      if (i === folders.length) {
        console.warn('==Update Archive Finished==');
        return finish();
      }
      if (modified[folders[i]]) {
        console.log('add: ' + join(dir, folders[i]));
        spawn('git',['add', '-A'], {cwd: join(dir, folders[i]), stdio: github.stdio})
          .on('exit', function () {
            console.log('commit: ' + join(dir, folders[i]));
            spawn('git',['commit', '-m', 'Add messages'], {cwd: join(dir, folders[i]), stdio: github.stdio})
              .on('exit', function () {
                console.log('push: ' + join(dir, folders[i]));
                spawn('git push origin master', [], {cwd: join(dir, folders[i]), stdio: github.stdio})
                  .on('exit', function () {
                    next(i + 1);
                  });
              });
          });
      } else {
        next(i + 1);
      }
    }
    next(0);
  }, true);
}

function normaliseDate(date) {
  var month = '' + (date.getMonth() + 1);
  if (month.length === 1) month = '0' + month;
  return date.getFullYear() + '-' + month;
}

function cloneFolder(dir, repo, github, next) {
  try {
    fs.statSync(join(dir, repo));
  } catch (ex) {
    var client = new GitHub({version: '3.0.0'});
    client.authenticate(github.user);
    client.repos.createFromOrg({
      org: github.organisation,
      name: repo,
      team_id: github.team
    }, function (err, res) {
      if (err && !(err.message && /already exists/.test(err.message))) {
        return next(err);
      }
      setTimeout(function () {
        spawn(cloneCMD.replace('[user]', github.organisation)
                      .replace('[repo]', repo),
            [],
            {
              cwd: dir,
              stdio: github.stdio
            })
        .on('exit',
          function () {
            next();
          });
      }, 100);
    });
    return;
  }
  spawn('git pull origin master',
      [],
      {
        cwd: join(dir, repo),
        stdio: github.stdio
      })
  .on('exit',
    function () {
      next();
    });
}
