var Writable = require('stream').Writable,
  util = require('util');

module.exports = Sink;

function Sink() {
  Writable.call(this, {
    objectMode: true
  });
}

util.inherits(Sink, Writable);

Sink.prototype._write = function (object, encoding, callback) {
  callback();
}
