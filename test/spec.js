var should = require('should'),
  Source = require('./lib/source'),
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
        var options = defaultOptions();
        options.limit = '10';
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
        var options = defaultOptions();
        options.stream = new Sink();
        Throtl(options);
      }).should.throw('stream must have .pause() and .resume() methods');
    });

    it('should allow streams with .pause() and .resume() methods', function () {
      var s = new Sink();
      (function () {
        var options = defaultOptions();
        options.stream = new Sink();
        options.stream.pause = function() {};
        options.stream.resume = function() {};
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
        var options = defaultOptions();
        options.callback = {
          foo: 'bar'
        };
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
        var options = defaultOptions();
        options.done = {
          foo: 'bar'
        };
        Throtl(options);
      }).should.throw('done must be a function');
    });

  });

  describe('Callback synchronicity', function () {

    it('Synchronous should work', function (done) {
      var options = defaultOptions();
      options.done = function (errors) {
        done();
      };
      Throtl(options);
    });

    it('Asynchronous should work too', function (done) {
      var options = defaultOptions();
      options.callback = function (data, next) {
        process.nextTick(next);
      };
      options.done = function (errors) {
        done();
      };
      Throtl(options);
    });

  });

  describe('Errors', function () {

    it('should accumulate from next() to done()', function (done) {
      var options = defaultOptions();
      var counter = 0;
      options.callback = function (data, next) {
        counter += 1;
        if (counter >= 10 && counter < 20)
          next(new Error('uhoh'));
        else
          next();
      };
      options.done = function (errors) {
        (errors).should.be.an.Array;
        (errors.length).should.equal(10);
        done();
      };
      Throtl(options);
    });

  });

});

var defaultOptions = function () {
  return {
    limit: 10,
    stream: new Source(),
    callback: function (data, next) {
      next();
    },
    done: function (errors) {}
  };
}
