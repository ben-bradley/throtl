var Readable = require('stream').Readable;

module.exports = Throtl;

/**
 * Throtl a stream based on an arbitrary ticker
 * @param   {Object} options Options for setting the limit & stream to be throtld
 * @returns {Object} Returns the throtl object
 */
function Throtl(options) {
  if (!(this instanceof Throtl))
    return new Throtl(options);

  this._pending = 0;
  this._buffer = [];
  this._errors = [];
  this._paused = false;

  options = options || {};

  this.limit(options.limit);
  this.callback(options.callback);
  this.done(options.done);
  this.stream(options.stream);

  return this;
}

Throtl.prototype.callback = function(callback) {
  if (typeof callback !== 'function')
    throw new Error('callback must be a function');
  this._callback = callback;
  return this;
}

Throtl.prototype.done = function(done) {
  if (typeof done !== 'function')
    throw new Error('done must be a function');

  var self = this;

  this._done = function(err) {
    if (!self._buffer.length && self._streamDone && !self._pending) {
      if (self._errors.length)
        done(self._errors);
      else
        done();
    }
  };
  return this;
}

/**
 * Sets the throtl limit
 * @param   {Number} limit The maximum limit of the throtl
 * @returns {Object} Returns the throtl object
 */
Throtl.prototype.limit = function (limit) {
  if (typeof limit !== 'number')
    throw new Error('limit value must be a number');
  else if (limit === 0)
    limit = Infinity;
  this._limit = limit;
  return this;
}

/**
 * Sets the stream to be throtld
 * @param   {Stream} stream The Readable stream to be throtld
 * @returns {Object} Returns the throtl object
 */
Throtl.prototype.stream = function (stream) {
  if (!stream || stream instanceof Readable === false)
    throw new Error('stream must be a Readable stream');

  var self = this;

  self._stream = stream;

  stream.on('data', function(data) {
    self._buffer.push(data);
    if (!self._paused && self._pending >= self._limit) {
      self._paused = true;
      self._stream.pause();
    }
    else
      self._readBuffer();
  });

  stream.on('end', function() {
    self._streamDone = true;
    self._done();
  });

  return this;
}

Throtl.prototype._readBuffer = function() {
  var data = this._buffer.shift();
  if (data === null)
    return this._done();

  this._pending += 1;
  this._callback(data, this._next.bind(this));
}

Throtl.prototype._next = function(err) {
  if (err)
    this._errors.push(err);

  this._pending -= 1;

  if (this._paused && this._pending < this._limit) {
    this._paused = false;
    this._stream.resume();
  }

  if (this._buffer.length)
    this._readBuffer();
  else
    this._done();
}
