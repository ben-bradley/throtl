var Readable = require('stream').Readable,
  util = require('util');

module.exports = Source;

function Source() {
  Readable.call(this, {
    objectMode: true
  });
}

util.inherits(Source, Readable);

Source.prototype._read = function () {
  for (var i = 0; i < 12; i++) {
    for (var n = 0; n < 1000; n++) {
      if (this.readable) {
        this.push({
          i: i,
          n: n
        });
      }
      if (i === 11 && n === 999)
        this.push(null);
    }
  }
}
