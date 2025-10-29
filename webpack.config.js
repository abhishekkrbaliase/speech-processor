const path = require('path');
const fs = require('fs');

// Copy HTML and JS files after build
function copyRendererFiles() {
  const srcDir = path.join(__dirname, 'src', 'renderer');
  const distDir = path.join(__dirname, 'dist');
  
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Copy all HTML files
  const htmlFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.html'));
  htmlFiles.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const distPath = path.join(distDir, file);
    fs.copyFileSync(srcPath, distPath);
    console.log(`Copied ${file} to dist/`);
  });
  
  // Copy all JS files (like overlay-new.js)
  const jsFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.js'));
  jsFiles.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const distPath = path.join(distDir, file);
    fs.copyFileSync(srcPath, distPath);
    console.log(`Copied ${file} to dist/`);
  });
}

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

// Add a plugin to copy HTML and JS files after build
module.exports.forEach(config => {
  if (!config.plugins) config.plugins = [];
  config.plugins.push({
    apply: (compiler) => {
      compiler.hooks.afterEmit.tap('CopyRendererFilesPlugin', () => {
        copyRendererFiles();
      });
    }
  });
});