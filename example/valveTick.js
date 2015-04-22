var Throtl = require('../'),
  Source = require('./source'),
  through = require('through');

var stream = new Source(),
  valve = new Throtl.Valve({
    limit: 10,
    objectMode: true
  });

/*
  If you want to, you can call the .tick() method to signal that
  the data event is complete and to cause the valve to emit the
  next data event.
*/

stream
  .pipe(valve)
  .pipe(through(function (data) {
    setTimeout(function () {
      this.queue(data);
      valve.tick();               // <-- HERE
    }.bind(this), 1000);
  }, function () {}))
  .pipe(through(function(data) {
    console.log('got: ', data);
  }, function() {}));

stream.on('end', function() {
  console.log('Read stream complete!');
});
