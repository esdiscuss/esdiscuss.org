var through = require('through');

module.exports = escapeStream;
function escapeStream() {
  return through(function (chunk) {
    this.queue(chunk.toString('utf8').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  });
}