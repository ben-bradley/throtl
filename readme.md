# Throtl [![Build Status](https://secure.travis-ci.org/ben-bradley/throtl.png)](http://travis-ci.org/ben-bradley/throtl)

[![NPM](https://nodei.co/npm/throtl.png?downloads=true)](https://nodei.co/npm/throtl/)

> Easily manage concurrent operations on stream data events.

Throtl is a module that very closely resembles [stream-worker](https://github.com/goodeggs/stream-worker), but allows for multiple instances of the throttler and makes it possible to adjust the concurrency limits on the fly!

## Install

```
npm install throtl
```

## Examples

### Typical

> In the typical scenario, you want to throttle a stream so that you can process the final results of the stream.

```javascript
var Throtl = require('throtl'),
  Source = require('./test/lib/source');

// Source provides a Readable objectMode stream, but any stream will work
// check the test/lib folder to see what Source does if your curious

var myThrotl = new Throtl({
  limit: 10,
  stream: new Source(),
  callback: function(data, next) {
    // do something with data and call next() when you're done
    process.nextTick(next);
  },
  done: function(errors) {
    console.log('All !data events complete from Source()');
  }
});
```

### Pipe Valve

> In the pipe valve scenario, you have a stream pipeline that you want to throttle.

```javascript
var Throtl = require('../'),
  Source = require('./source'),
  Transform = require('stream').Transform;

var valve = new Throtl.Valve({
  limit: 20,
  objectMode: true
});

var transform = new Transform({
  objectMode: true
});

transform._transform = function (data, encoding, callback) {
  // here you might want to do some async lookups to augment the data
  var start = new Date().getTime();
  var _this = this;
  setTimeout(function () {
    data.foo = 'bar';
    var end = new Date().getTime();
    _this.push(data);
  }, 1000);
  callback();
}

transform._flush = function(done) {}

var stream = new Source();

/*
  You can put valve.next in the pipeline to signal when the intermediary
  stream data event processesing is complete.
*/

stream
  .pipe(valve)
  .pipe(transform)
  .pipe(valve.next);
```

## API

### __`new Throtl(options)`__

Instantiates a new Throtl

- __`options`__ - An object with the following properties:
  - `limit` - (Number) The maximum number of concurrent `callback`'s to run.
  - `stream` - (Readable Stream) The stream for which you want to manage concurrency.
  - `callback` - (Function, signature `callback(data, next)`) The function to call for each `data` event from the `stream`.
    - `data` - (Mixed) The data emitted by the stream with each `data` event.
    - `next` - (Function, signature `next(error)`) The function call to signal that you're done processing the `data`.
      - `error` - (Error, _optional_) An optional `Error` that is accumulated and provided in `done(errors)`.
  - `done` - (Function, signature `done(errors)`) The function to call when the stream ends.
    - `errors` - (Array or Null) If the `next()` callback is provided an Error, it will accumulate here.

### __`throtl.limit(number)`__

Adjusts the throtl limit on the fly.  Based on the result of your `callback()`, you may want to tune the limit up or down.

```javascript
var Throtl = require('../'),
  Source = require('./source');

var counter = 0;

var throtl = new Throtl({
  limit: 10,
  stream: new Source(),
  callback: function(data, next) {
    setTimeout(function() {
      counter += 1;

      if (counter < 5)
        throtl.limit(5) // speed it up to 5 at a time
      else if (counter < 10)
        throtl.limit(10); // go faster, 10 at a time!
      else if (counter < 30)
        throtl.limit(1); // woah! slow it down
      else if (counter < 50)
        throtl.limit(20); // nevermind, go fast!
      else if (counter < 90)
        throtl.limit(10); // and back to a reasonable speed

      console.log(counter, data);

      next();
    }, 500);
  },
  done: function(errors) {
    console.log('throtl.Done!', errors);
  }
});
```

### __`new Throtl.Valve(options)`__

Instantiates a new Valve for a stream pipeline

- __`options`__ - An object that is used to create the stream valve.  It's passed on to `require('stream').PassThrough`, but it also expects a `limit` property
  - `limit` - (Number) The maximum number of concurrent `data` events to process

## Version History

- 0.1.0 - Added Valve interface
- 0.0.3 - Removed internal buffer in favor of stream buffer
- 0.0.2 - Fix to allow streams not instantiated from Readable
- 0.0.1 - Initial release
