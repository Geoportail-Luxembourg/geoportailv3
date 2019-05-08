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

const name = process.env.INTERFACE;
process.env.THEME = INTERFACE_THEME[name];

entry[name] = 'geoportailv3/apps/Controller' + name + '.js';
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

const babelPresets = [['env',{
  "targets": {
    "browsers": ["last 2 versions", "Firefox ESR", "ie 11"],
  },
  "modules": false,
  "loose": true,
}]]

// Transform code to ES2015 and annotate injectable functions with an $inject array.
const projectRule = {
  test: /geoportailv3_geoportal\/static-ngeo\/js\/.*\.js$/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: babelPresets,
      plugins: ['@camptocamp/babel-plugin-angularjs-annotate'],
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

module.exports = {
  output: {
    path: path.resolve(__dirname, 'geoportailv3_geoportal/static-ngeo/build/'),
    publicPath: devServer ? '${VISIBLE_ENTRY_POINT}dev/' : '${VISIBLE_ENTRY_POINT}static-ngeo/UNUSED_CACHE_VERSION/build/'
  },
  entry: entry,
  module: {
    rules
  },
  plugins: plugins,
  resolve: {
    alias: {
      geoportailv3: path.resolve(__dirname, 'geoportailv3_geoportal/static-ngeo/js'),
    }
  },
};
