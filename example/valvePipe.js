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
