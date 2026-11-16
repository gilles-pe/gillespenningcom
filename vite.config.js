import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 builds one self-contained HTML file for previews.
export default defineConfig({
  base: './',
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  // legal.html is a second, script-free page built next to index.html.
  build: process.env.SINGLE ? { outDir: 'dist-single', assetsInlineLimit: 100000000 } : { rollupOptions: { input: { main: 'index.html', legal: 'legal.html' } } },
});
