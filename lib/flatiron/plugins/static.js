/*
 * static.js: Top-level plugin exposing st's static server to flatiron app
 *
 * (C) 2012, Nodejitsu, Inc.
 * MIT LICENSE
 *
 */

var path = require('path'),
    http = require('http'),
    flatiron = require('../../flatiron'),
    common = flatiron.common, st;

try {
  //
  // Attempt to require st.
  //
  st = require('st');
}
catch (ex) {
  //
  // Do nothing since this is a progressive enhancement
  //
  console.warn('flatiron.plugins.static requires the `st` module from npm');
  console.warn('install using `npm install st`.');
  console.trace();
  process.exit(1);
}

exports.name = 'static';

exports.attach = function (options) {
  var app = this;

  options = options || {};

  //
  // Accept string `options`
  //
  if (typeof options === 'string') {
    options = { root: options };
  }

  //
  // Default overrides
  //
  options.index = false;
  options.dot = false;
  options.url = '/';

  //
  // Attempt to merge defaults passed to `app.use(flatiron.plugins.static)`
  // with any additional configuration that may have been loaded
  options = common.mixin(
    {},
    options,
    app.config.get('static') || {}
  );

  app.config.set('static', options);

  //
  // `app.static` api to be used by other plugins
  // to server static files
  //
  app.static = function (dir) {
    options.path = dir;
    var mount = st(options);
    app.http.before = app.http.before.concat(
        function (req, res, next) {
          res.error = function (statusCode, err) {
            if (statusCode === 404) {
              //reset this :P
              res.statusCode = 200;
              return res.emit('next');
            }
            else {
              res.setHeader('content-type', 'text/plain');
              res.end(http.STATUS_CODES[statusCode]+'\n');
            }
          }
          if (!mount(req, res)) {
            return res.emit('next');
          }
        });
  }

  // * `options.dir`: Explicit path to assets directory
  // * `options.root`: Relative root to the assets directory ('/app/assets')
  // * `app.root`: Relative root to the assets directory ('/app/assets')
  if (options.dir || options.root || app.root) {
    app._staticDir = options.dir
      || path.join(options.root || app.root, 'app', 'assets');

    //
    // Serve staticDir using middleware in union
    //
    app.static(app._staticDir);
  }
}
