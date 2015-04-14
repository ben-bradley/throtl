module.exports = Throtl;

/**
 * Throtl a stream based on an arbitrary ticker
 * @param   {Object} options Options for throtl instance
 * @returns {Object} Returns the throtl instance
 */
function Throtl(options) {
  if (!(this instanceof Throtl))
    return new Throtl(options);

  this._pending = 0;
  this._errors = [];
  this._paused = false;

  options = options || {};

  this.limit(options.limit);
  this.callback(options.callback);
  this.done(options.done);
  this.stream(options.stream);

  return this;
}

/**
 * Method to assign the callback to call with each data event
 * @param   {Function} callback The function to call on stream data evnets
 * @returns {Object}   Returns the throtl instance for chaining
 */
Throtl.prototype.callback = function(callback) {
  if (typeof callback !== 'function')
    throw new Error('callback must be a function');
  this._callback = callback;
  return this;
}

/**
 * Method to assign the callback to call when the stream is done
 * @param   {Function} done The function to call on the stream end event
 * @returns {Object}   Returns the throtl instance for chaining
 */
Throtl.prototype.done = function(done) {
  if (typeof done !== 'function')
    throw new Error('done must be a function');

  this._done = function(err) {
    if (this._streamDone && !this._pending) {
      if (this._errors.length)
        done(this._errors);
      else
        done();
    }
  }.bind(this);
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
  if (!stream)
    throw new Error('must provide a stream');

  var pausable = false,
    resumable = false;
  for (var method in stream) {
    if (method === 'pause')
      pausable = true;
    else if (method === 'resume')
      resumable = true;
  }
  if (!pausable || !resumable)
    throw new Error('stream must have .pause() and .resume() methods');

  this._stream = stream;

  stream.on('data', this._dataEvent.bind(this));

  stream.on('end', function() {
    this._streamDone = true;
    this._done();
  }.bind(this));

  return this;
}

/**
 * Internal method to read the next data event
 * @returns {Mixed} Using return to bail on done
 */
Throtl.prototype._dataEvent = function(data) {
  this._pending += 1;
  if (!this._paused && this._pending >= this._limit) {
    this._paused = true;
    this._stream.pause();
  }
  this._callback(data, this._next.bind(this));
}

/**
 * Internal method to iterate the data event payload
 * @param {Error} err Optional argument if there are errors in the callbackuu
 */
Throtl.prototype._next = function(err) {
  if (err)
    this._errors.push(err);

  this._pending -= 1;

  if (this._paused && this._pending < this._limit) {
    this._paused = false;
    this._stream.resume();
  }

  if (this._streamDone)
    this._done();
}
