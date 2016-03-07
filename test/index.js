process.env.NODE_ENV = 'production';

var test = require('testit');
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
  test(path, function () {
    var req = get(path);
    test('returns a status code ' + statusCode, function (done) {
      return req
        .then(function (res) {
          assert.equal(res.statusCode, statusCode);
        });
    }, '20s');
    if (typeof fn === 'function') {
      fn(req);
    }
  });
}
path('/', 200);
path('/favicon.ico', 200);
path('/1', 200, function (response) {
  test('has a link to the next page', function () {
    return response
      .then(function (res) {
        assert(/href="\/2"/.test(res.body));
      });
  });
  test('has no link to the previous page', function () {
    return response
      .then(function (res) {
        assert(!/href="\/0"/.test(res.body));
      });
  });
});

path('/100', 200);
path('/10000', 404);

path('/topic/coordinationwasesmodules', 200);
path('/topic/creating-your-own-errors', 200);

path('/history/2013-10-07T12%3A23%3A05.000Z-claude.pache.gmail.com', 200);

path('/pipermail/es-discuss/2013-June/030958.html', 200);
path('/pipermail/es-discuss/2013-June/930958.html', 404);

path('/notes', 200);
path('/notes/2013-03-14', 200);

path('/rss', 200);
test('close', function () {
  setTimeout(function () {
    process.exit(0);
  }, 1000);
});
