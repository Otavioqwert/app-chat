import { defineConfig } from 'vite';
import path from 'path';

// __dirname não é suportado em módulos ES com configLoader:native
// Usar import.meta.dirname (disponível no Node.js 20+)
const dirname = import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {  // ← função, não objeto
          if (id.includes('node_modules/marked')) {
            return 'vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
                            '@scss': path.resolve(dirname, 'src/scss'),
                            '@js': path.resolve(dirname, 'js'),
    }
  }
});
