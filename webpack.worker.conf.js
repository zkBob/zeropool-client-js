const path = require('path');

module.exports = {
  entry: {
    workerSt: './src/workerSt.ts',
    workerMt: './src/workerMt.ts',
  },
  target: 'webworker',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.join(process.cwd(), 'lib'),
    filename: '[name].js',
  },
};
