var should = require('should'),
  Stream = require('stream'),
  Source = require('./lib/source'),
  SourceStack = require('./lib/source_stack'),
  Sink = require('./lib/sink'),
  Throtl = require('../');

describe('Throtl', function () {

  it('should return an instance when "New"ed', function () {
    var throtl = new Throtl(defaultOptions());
    (throtl).should.be.an.instanceOf(Throtl);
  });

  it('should return an instance when not "New"ed', function () {
    var throtl = Throtl(defaultOptions());
    (throtl).should.be.an.instanceOf(Throtl);
  });

  describe('option validation', function () {

    it('requires a limit', function () {
      (function () {
        var options = defaultOptions();
        delete options.limit;
        Throtl(options);
      }).should.throw('limit value must be a number');
    });

    it('requires limit to be an number', function () {
      (function () {
        var options = defaultOptions({
          limit: '10'
        });
        Throtl(options);
      }).should.throw('limit value must be a number');
    });

    it('requires a stream', function () {
      (function () {
        var options = defaultOptions();
        delete options.stream;
        Throtl(options);
      }).should.throw('must provide a stream');
    });

    it('requires stream to have .pause() & .resume() methods', function () {
      (function () {
        var options = defaultOptions({
          stream: new Sink()
        });
        Throtl(options);
      }).should.throw('stream must have .pause() and .resume() methods');
    });

    it('should allow streams with .pause() and .resume() methods', function () {
      var s = new Sink();
      (function () {
        var options = defaultOptions({
          stream: new Sink()
        });
        options.stream.pause = function () {};
        options.stream.resume = function () {};
        Throtl(options);
      }).should.not.throw();
    })

    it('requires a callback', function () {
      (function () {
        var options = defaultOptions();
        delete options.callback;
        Throtl(options);
      }).should.throw('callback must be a function');
    });

    it('requires callback to be a function', function () {
      (function () {
        var options = defaultOptions({
          callback: {
            foo: 'bar'
          }
        });
        Throtl(options);
      }).should.throw('callback must be a function');
    });

    it('requires a done', function () {
      (function () {
        var options = defaultOptions();
        delete options.done;
        Throtl(options);
      }).should.throw('done must be a function');
    });

    it('requires done to be a function', function () {
      (function () {
        var options = defaultOptions({
          done: {
            foo: 'bar'
          }
        });
        Throtl(options);
      }).should.throw('done must be a function');
    });

  });

  describe('Callback synchronicity', function () {

    it('Synchronous should work', function (done) {
      var options = defaultOptions({
        done: done
      });
      Throtl(options);
    });

    // Use a test like this one to test the optimize flag
    it('Asynchronous should work too', function (done) {
      this.timeout(5000);
      var results = [];
      var options = defaultOptions({
        limit: 3,
        callback: function (data, next) {
          results.push(data);
          setTimeout(next, 100);
        },
        done: function (err) {
          (err === undefined).should.be.true;
          (results).should.be.an.Array;
          (results.length).should.equal(100);
          (results[99]).should.be.an.Object.with.properties(['i', 'n']);
          (results[99].i).should.eql(9);
          (results[99].n).should.eql(9);
          done();
        }
      });
      Throtl(options);
    });

  });

  describe('Errors', function () {

    it('should accumulate from next() to done()', function (done) {
      var options = defaultOptions();
      var counter = 0;

      var options = defaultOptions({
        callback: function (data, next) {
          counter += 1;
          if (counter >= 10 && counter < 20)
            next(new Error('uhoh'));
          else
            next();
        },
        done: function (errors) {
          (errors).should.be.an.Array;
          (errors.length).should.equal(10);
          done();
        }
      });

      Throtl(options);
    });

  });

  describe('Callback stack size', function () {

    it('should not cause an asplosion!', function (done) {
      (function () {
        var options = new defaultOptions({
          stream: new SourceStack(),
          done: done
        });
        Throtl(options);
      }).should.not.throw();
    });

  });

  describe('Valve interface', function () {

    it('should allow for throttling in a stream pipe', function (done) {
      var stream = new Source();

      var valve = new Throtl.Valve({
        limit: 10,
        objectMode: true
      });

      var results = [];

      var passthrough = new Stream.PassThrough({
        objectMode: true
      });
      var counter = 0;
      passthrough.on('data', function (data) {
        results.push(data);
        if (++counter > 10) {
          passthrough.pause();
          setTimeout(passthrough.resume.bind(this), 100);
          counter = 0;
        }
      });

      stream
        .pipe(valve)
        .pipe(passthrough)
        .pipe(valve.next);

      valve.next.on('end', function () {
        (results.length).should.eql(100);
        (valve._paused).should.be.greaterThan(0);
        (valve._resumed).should.be.greaterThan(0);
        done();
      });
    });

    it('should allow for throttling a stream pipe by the .tick() call', function (done) {
      var stream = new Source();

      var valve = new Throtl.Valve({
        limit: 10,
        objectMode: true
      });

      var results = [];

      var passthrough = new Stream.PassThrough({
        objectMode: true
      });

      var counter = 0;
      passthrough.on('data', function (data) {
        results.push(data);
        if (++counter > 10) {
          passthrough.pause();
          setTimeout(passthrough.resume.bind(this), 100);
          counter = 0;
        }
        valve.tick(data);
      });

      stream
        .pipe(valve)
        .pipe(passthrough);

      passthrough.on('end', function () {
        (results.length).should.eql(100);
        (valve._paused).should.be.greaterThan(0);
        (valve._resumed).should.be.greaterThan(0);
        done();
      });
    });

  });

});

var defaultOptions = function (options) {
  options = options || {};
  return {
    limit: (options.limit || 10),
    stream: (options.stream || new Source()),
    callback: (options.callback || function (data, next) {
      next();
    }),
    done: (options.done || function (errors) {})
  };
}
