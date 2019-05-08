const webpackMerge = require('webpack-merge');
const apps = require('./webpack.apps.js');
const commons = require('ngeo/buildtools/webpack.commons');

let config = commons.config({}, false);
let devProdConfig;

const nodeEnv = process.env['NODE_ENV'] || 'development';
switch (nodeEnv) {
  case 'development':
    devProdConfig = require('ngeo/buildtools/webpack.dev');
    break;
  case 'production':
    devProdConfig = require('ngeo/buildtools/webpack.prod')(false);
    break;
  default:
    console.log(`The 'NODE_ENV' environment variable is set to an invalid value: ${process.env.NODE_ENV}.` );
    process.exit(2);
}

config = webpackMerge(config, apps, devProdConfig);


module.exports = config;
