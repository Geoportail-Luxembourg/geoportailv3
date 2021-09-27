const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'apiv4.js',
    library: 'lux',
    libraryTarget: 'umd',
    globalObject: 'this',
    libraryExport: 'default',
  },
};
