const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync('dist', { recursive: true });

// Build with Webpack
console.log('Building with Webpack...');
execSync('npx webpack --mode production', { stdio: 'inherit' });

// Copy static files
console.log('Copying static files...');
fs.copyFileSync('manifest.json', 'dist/manifest.json');
fs.copyFileSync('background.js', 'dist/background.js');
fs.copyFileSync('content.js', 'dist/content.js');

// Copy any other necessary files
// fs.copyFileSync('src/assets/icon.png', 'dist/icon.png');

console.log('Build completed successfully!'); 