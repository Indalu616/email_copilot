import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';

// Plugin to copy extension files
const copyExtensionFiles = () => {
  return {
    name: 'copy-extension-files',
    writeBundle() {
      // Copy manifest.json
      copyFileSync('src/manifest.json', 'dist/manifest.json');
      
      // Create icons directory
      mkdirSync('dist/icons', { recursive: true });
      
      // Create simple colored squares as PNG placeholders
      const createSimpleIcon = (size) => {
        // Create a simple SVG and save as PNG placeholder
        const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" rx="${Math.floor(size/8)}" fill="#4285f4"/>
          <rect x="${Math.floor(size/4)}" y="${Math.floor(size/4)}" width="${Math.floor(size/2)}" height="${Math.floor(size/2)}" rx="${Math.floor(size/16)}" fill="white"/>
          <circle cx="${Math.floor(size/2)}" cy="${Math.floor(size*0.375)}" r="${Math.floor(size/16)}" fill="#34a853"/>
          <circle cx="${Math.floor(size*0.375)}" cy="${Math.floor(size*0.625)}" r="${Math.floor(size/16)}" fill="#34a853"/>
          <circle cx="${Math.floor(size*0.625)}" cy="${Math.floor(size*0.625)}" r="${Math.floor(size/16)}" fill="#34a853"/>
        </svg>`;
        return svg;
      };
      
      // Create icon files (as SVG for simplicity)
      writeFileSync('dist/icons/icon16.png', createSimpleIcon(16));
      writeFileSync('dist/icons/icon48.png', createSimpleIcon(48));
      writeFileSync('dist/icons/icon128.png', createSimpleIcon(128));
      
      // Copy content styles
      try {
        mkdirSync('dist/styles', { recursive: true });
        copyFileSync('src/styles/content.css', 'dist/styles/content.css');
      } catch (err) {
        console.log('Content styles not found');
      }
      
      console.log('Extension files copied successfully!');
    }
  };
};

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/background.js'),
        contentScript: resolve(__dirname, 'src/content/contentScript.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    outDir: 'dist',
    sourcemap: false,
    minify: false,
    emptyOutDir: true,
    copyPublicDir: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
