const path = require('path');
const ls = require('ls');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const INTERFACE_THEME = {"desktop":"desktop","desktop_alt":"desktop","mobile":"mobile","mobile_alt":"mobile","oeview":"desktop","oeedit":"desktop"};

const plugins = [];
const entry = {};

// The dev mode will be used for builds on local machine outside docker
const nodeEnv = process.env['NODE_ENV'] || 'development';
const dev = nodeEnv == 'development'
process.traceDeprecation = true;

const name = 'main';
process.env.THEME = INTERFACE_THEME[name];

entry[name] = 'geoportailv3/apps/MainController.js';
plugins.push(
  new HtmlWebpackPlugin({
    inject: false,
    template: path.resolve(__dirname, 'geoportailv3_geoportal/static-ngeo/js/apps/' + name + '.html.ejs'),
    chunksSortMode: 'manual',
    filename: name + '.html',
    chunks: [name],
    vars: {
      entry_point: '${VISIBLE_ENTRY_POINT}',
    },
  })
);

const babelPresets = [require.resolve('@babel/preset-env'), {
  targets: {
    browsers: ['> 0.5% in CH', '> 0.5% in FR', 'Firefox ESR', 'ie 11'],
  }
}]

// Transform code to ES2015 and annotate injectable functions with an $inject array.
const projectRule = {
  test: /geoportailv3_geoportal\/static-ngeo\/js\/.*\.js$/,
  use: {
    loader: 'babel-loader',
    options: {
      babelrc: false,
      comments: false,
      presets: [babelPresets],
      plugins: ['babel-plugin-angularjs-annotate'],
    }
  },
};

const rules = [
  projectRule,
];

const noDevServer = process.env['NO_DEV_SERVER'] == 'TRUE';
devServer = dev && !noDevServer;

console.log("Use dev mode: " + dev)
console.log("Use dev server mode: " + devServer)

rules.push({
  test: /\.js$/,
  use: ["source-map-loader"],
  enforce: "pre"
});

module.exports = {
  output: {
    path: '/etc/static-ngeo/',
    publicPath: devServer ? '${VISIBLE_ENTRY_POINT}dev/' : '.__ENTRY_POINT__static-ngeo/'
  },
  devServer: {
    publicPath: '${VISIBLE_WEB_PROTOCOL}://${VISIBLE_WEB_HOST}${VISIBLE_ENTRY_POINT}dev/',
    port: 8080,
    host: 'webpack_dev_server',
    hot: true,
  },
  entry: entry,
  module: {
    rules
  },
  plugins: plugins,
  resolve: {
    modules: ['/usr/lib/node_modules'],
    alias: {
      geoportailv3: path.resolve(__dirname, 'geoportailv3_geoportal/static-ngeo/js'),
      'bootstrap': '/usr/lib/node_modules/bootstrap/',
      'jsts': '/usr/lib/node_modules/jsts/org/locationtech/jts',
      'ol/ol.css': '/usr/lib/node_modules/ol/ol.css',
      'ol': '/usr/lib/node_modules/ol/src',
      'olcs': '/usr/lib/node_modules/ol-cesium/src/olcs',
      'jquery-ui/datepicker': '/usr/lib/node_modules/jquery-ui/ui/widgets/datepicker', // For angular-ui-date
      'proj4': '/usr/lib/node_modules/proj4/lib',
    }
  },
};
