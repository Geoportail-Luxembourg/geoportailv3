const webpack = require('webpack');


const resourcesRule = {
  test: /\.(jpeg|png|svg|ico|cur|eot|ttf|woff|woff2)$/,
  use: {
    loader: 'file-loader',
    options: {
      name: 'build/[path][name].[ext]'
    }
  }
};

const loaderOptionsPlugin = new webpack.LoaderOptionsPlugin({
  debug: false
});


module.exports = {
  mode: 'development',
  output: {
    filename: '[name].js'
  },
  module: {
    rules: [
      resourcesRule,
    ]
  },
};
