var Throtl = require('../'),
  Source = require('./source');

Throtl({
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
