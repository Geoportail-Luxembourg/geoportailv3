var closure = require('closure-util');
var nomnom = require('nomnom');

var log = closure.log;

var options = nomnom.options({
  port: {
    abbr: 'p',
    'default': 3000,
    help: 'Port for incoming connections',
    metavar: 'PORT'
  },
  loglevel: {
    abbr: 'l',
    choices: ['silly', 'verbose', 'info', 'warn', 'error'],
    'default': 'info',
    help: 'Log level',
    metavar: 'LEVEL'
  }
}).parse();


/** @type {string} */
log.level = options.loglevel;

log.info('geoportail v3 js api', 'Parsing dependencies ...');
var manager = new closure.Manager({
  closure: true, // use the bundled Closure Library
  lib: [
    'jsapi/src/**/*.js',
    'node_modules/openlayers/src/**/*.js',
    'node_modules/openlayers/build/ol.ext/*.js'
  ],
  main: ['jsapi/examples/*.js']
});
manager.on('error', function(e) {
  log.error('geoportail v3 js api', e.message);
});
manager.on('ready', function() {
  var server = new closure.Server({
    root: 'jsapi/examples',
    manager: manager
  });
  server.listen(options.port, function() {
    log.info('geoportail v3 js api', 'Listening on http://localhost:' +
        options.port + '/ (Ctrl+C to stop)');
  });
  server.on('error', function(err) {
    log.error('geoportail v3 js api', 'Server failed to start: ' + err.message);
    process.exit(1);
  });
});
