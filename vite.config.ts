import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/@firebase/auth/')) return 'firebase-auth';
            if (id.includes('/node_modules/re2js/')) return 'firebase-regex';
            if (
              id.includes('/node_modules/@firebase/firestore/') ||
              id.includes('/node_modules/@firebase/webchannel-wrapper/')
            ) return 'firebase-firestore';
            if (id.includes('/node_modules/@firebase/')) return 'firebase-core';
          },
        },
      },
    },
  };
});
