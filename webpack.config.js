const path = require('path');
const fs = require('fs');

module.exports = [
  // Main process configuration
  {
    mode: process.env.NODE_ENV || 'development',
    target: 'electron-main',
    entry: './src/main/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'electron': 'commonjs electron',
      '@google-cloud/speech': 'commonjs @google-cloud/speech',
    },
  },
  
  // Preload script configuration
  {
    mode: process.env.NODE_ENV || 'development',
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    externals: {
      'electron': 'commonjs electron',
    },
  },
  
  // Renderer process configuration (main window)
  {
    mode: process.env.NODE_ENV || 'development',
    target: 'electron-renderer',
    entry: './src/renderer/renderer.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
  },
  
  // Overlay renderer configuration
  {
    mode: process.env.NODE_ENV || 'development',
    target: 'electron-renderer',
    entry: './src/renderer/overlay.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'overlay.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
  },
];