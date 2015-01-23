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
