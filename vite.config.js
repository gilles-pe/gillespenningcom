import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 builds one self-contained HTML file for previews.
export default defineConfig({
  base: './',
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  build: process.env.SINGLE ? { outDir: 'dist-single', assetsInlineLimit: 100000000 } : {},
});
