var Client = new require('github');
var request = require('request');
var Q = require('q');

module.exports = GitHub;

function GitHub(settings) {
  this.settings = settings;
  this.client = new Client({version: '3.0.0', debug: false});
  this.client.authenticate(settings.user);

  this.createdRepos = {};
}

GitHub.prototype.createRepo = function (repo) {
  if (this.createdRepos[repo]) return this.createdRepos[repo];
  var def = Q.defer();
  var self = this;
  var oldLog = require('github/util').log;
  require('github/util').log = function () {};
  function create() {
    return Q.nfcall(self.client.repos.createFromOrg, {
      org: self.settings.organisation,
      name: repo,
      auto_init: true,
      team_id: self.settings.team
    })
    .fail(function (err) {
      if (err && !(err.message && /already exists/.test(err.message))) {
        throw err;
      }
    });
  }
  return this.createdRepos[repo] = retry(create, 5)
    .then(function () {
      require('github/util').log = oldLog;
    }, function (err) {
      require('github/util').log = oldLog;
      self.createdRepos[repo] = false;
      throw err;
    });
};

GitHub.prototype.exists = function (date, message, attempts) {
  if (attempts === 0) return Q.resolve(false);
  attempts = attempts || 3;
  var self = this;
  var path = 'https://raw.github.com/'
          + this.settings.organisation + '/'
          + date + '/master/'
          + encodeURIComponent(message) + '/header.json';
  function exists() {
    return Q.nfcall(request.head, path)
      .spread(function (res) {
        if (res.statusCode != 200 && res.statusCode != 404) {
          throw new Error('Server responded with ' + res.statusCode + ' to:\n  '
            + path
            + (res.body ? '\n' + res.body.toString().replace(/^/g, '  ') : ''));
        } else if (res.statusCode === 404) {
          return false;
        } else {
          return true;
        }
      });
  }
  return retry(exists, 5)
    .then(function (exists) {
      if (!exists) {
        //console.warn('non-existant: ' + path);
      }
      return exists;
    });
};

GitHub.prototype.createCommit = function (repo) {
  return new Commit(this.client, this.settings, repo);
};

function Commit(client, settings, repo) {
  this.completed = false;
  this.repo = repo;
  this.client = client;
  this.settings = settings;
  this.shaLatestCommit = retry(Q.nfbind(client.gitdata.getReference, ({
    user: settings.organisation,
    repo: repo,
    ref: 'heads/master'
  })), 3).get('object').get('sha');
  this.shaBaseTree = this.shaLatestCommit
    .then(function (shaLatestCommit) {
      return retry(Q.nfbind(client.gitdata.getCommit, {
        user: settings.organisation,
        repo: repo,
        sha: shaLatestCommit
      }), 3);
    }).get('tree').get('sha');
  this.shaNewTree = this.shaBaseTree;
}

Commit.prototype.addFile = function (path, content) {
  return this.addFiles([{
    path: path,
    content: content
  }]);
};

Commit.prototype.addFiles = function (files) {
  this.assertLive();
  var settings = this.settings;
  var repo = this.repo;
  var client = this.client;
  var res = this.shaNewTree.then(function (shaBaseTree) {
    return retry(Q.nfbind(client.gitdata.createTree, {
        user: settings.organisation,
        repo: repo,
        tree: files.map(function (file) {
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            content: file.content
          }
        }),
        base_tree: shaBaseTree
      }), 3);
  });
  this.shaNewTree = res.get('sha');
  return res;
};

Commit.prototype.complete = function (message) {
  this.assertLive();
  this.completed = true;
  var settings = this.settings;
  var repo = this.repo;
  var client = this.client;
  return Q.all([this.shaLatestCommit, this.shaNewTree])
    .spread(function (shaLatestCommit, shaNewTree) {
      console.log('creating commit');
      return retry(Q.nfbind(client.gitdata.createCommit, {
        user: settings.organisation,
        repo: repo,
        message: message,
        tree: shaNewTree,
        parents: [shaLatestCommit]
      }), 3);
    })
    .get('sha')
    .then(function (shaNewCommit) {
      console.log('pushing commit');
      return retry(Q.nfbind(client.gitdata.createReference, {
        user: settings.organisation,
        repo: repo,
        ref: 'heads/master',
        sha: shaNewCommit
      }), 3)
      .fail(function (err) {
        if (err instanceof Error) throw err;
        else throw new Error(err);
      });
    });
};

Commit.prototype.assertLive = function () {
  if (this.completed)
    throw new Error('You can\'t interact with the commit after it\'s completed');
};

function retry(fn, attempts, delay) {
  delay = delay || 0;
  return attempts < 2 ? fn() : fn()
    .fail(function () {
      console.log('retrying: ' + (delay + 1));
      return Q.delay(Math.pow(2, delay) * 1000)
        .then(function () {
          return retry(fn, attempts - 1, delay + 1);
        });
    })
}