var ms = require('ms');

module.exports = csl;
function csl(namespace, exports) {
  return noop;
  if (namespace === 'process') return noop;
  exports = exports ||  {};
  exports.dir = function (obj) {
    console.dir(obj);
  }
  exports.error = function () {
    if (typeof arguments[0] === 'string') {
      arguments[0] = namespace + ': ' + arguments[0];
    }
    console.error.apply(console, arguments);
  }
  exports.info = function () {
    if (typeof arguments[0] === 'string') {
      arguments[0] = namespace + ': ' + arguments[0];
    }
    console.info.apply(console, arguments);
  }
  exports.log = function () {
    if (typeof arguments[0] === 'string') {
      arguments[0] = namespace + ': ' + arguments[0];
    }
    console.log.apply(console, arguments);
  }
  exports.warn = function () {
    if (typeof arguments[0] === 'string') {
      arguments[0] = namespace + ': ' + arguments[0];
    }
    console.warn.apply(console, arguments);
  }

  exports.time = function (name) {
    var start = Date.now();
    return function done(res) {
      var end = Date.now();
      console.log(namespace + ':' + name + ': ' + ms(end - start));
      return res;
    }
  }

  return exports;
}

csl('default', csl);

var noop = {};
noop.dir = function (obj) {
}
noop.error = function () {
}
noop.info = function () {
}
noop.log = function () {
}
noop.warn = function () {
}

noop.time = function (name) {
  return function done(res) {
    return res;
  }
}