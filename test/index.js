process.env.NODE_ENV = 'production';
require('mocha-as-promised')();

var promise = require('lazy-promise');
var request = require('hyperquest');
var concat = require('concat-stream');

var assert = require('assert');

var server = require('../server');

function get(path) {
  return promise(function (resolve, reject) {
    request('http://localhost:3000' + path, {}, function (err, res) {
      if (err) return reject(err);
      this.pipe(concat(function (err, body) {
        if (err) return reject(err);
        res.body = body.toString();
        resolve(res);
      }));
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
path('/1', 200, function (response) {
  it('has a link to the next page', function () {
    return response
      .then(function (res) {
        assert(/href="\/2"/.test(res.body));
      });
  });
  it('has no link to the previous page', function () {
    return response
      .then(function (res) {
        assert(!/href="\/0"/.test(res.body));
      });
  });
});
path('/100', 200);
path('/10000', 404);

path('/topic/coordinationwasesmodules', 200);
path('/source/2013-04-12T12:10:53.000Z', 301, function (response) {
  it('redirects to the original source', function () {
    return response
      .then(function (res) {
        assert.equal(res.headers.location, 'https://mail.mozilla.org/pipermail/es-discuss/2013-April/029712.html');
      });
  })
});

path('/notes', 200);
path('/notes/2013-03-14', 200);