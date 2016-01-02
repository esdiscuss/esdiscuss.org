process.env.NODE_ENV = 'production';
require('mocha-as-promised')();

var promise = require('lazy-promise');
var request = require('request');

var assert = require('assert');

var server = require('../server');

function get(path) {
  return promise(function (resolve, reject) {
    request('http://localhost:3000' + path, {}, function (err, res) {
      if (err) return reject(err);
      res.body = res.body.toString();
      resolve(res);
    });
  });
}
function path(path, statusCode, fn) {
  describe(path, function () {
    var req = get(path);
    it('returns a status code ' + statusCode, function (done) {
      this.timeout(20000);
      return req
        .then(function (res) {
          assert.equal(res.statusCode, statusCode);
        });
    });
    if (typeof fn === 'function') {
      fn(req);
    }
  });
}
path('/', 200);
path('/topics', 200, function (response) {
  it('has a link to the next page', function () {
    return response
      .then(function (res) {
        assert(/href="\/topics\/2"/.test(res.body));
      });
  });
  it('has no link to the previous page', function () {
    return response
      .then(function (res) {
        assert(!/href="\/topics\/0"/.test(res.body));
      });
  });
});

path('/topics/100', 200);
path('/topics/10000', 404);

path('/topic/coordinationwasesmodules', 200);
path('/topic/creating-your-own-errors', 200);

path('/history/2013-10-07T12%3A23%3A05.000Z-claude.pache.gmail.com', 200);

path('/pipermail/es-discuss/2013-June/030958.html', 200);
path('/pipermail/es-discuss/2013-June/930958.html', 404);

path('/notes', 200);
path('/notes/2013-03-14', 200);