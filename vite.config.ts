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
      // Otherwise watch source normally, but IGNORE the server-side data files the backend
      // rewrites at runtime: the JSON "database" and generated illustration PNGs. Without
      // this, every write to data_db.json (any job/book/character update) or saved library
      // illustration looks like a source change to Vite and triggers a full page reload,
      // remounting React mid-flow (bouncing the user to the Dashboard and killing in-progress
      // batch illustration rendering).
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          path.resolve(__dirname, 'data_db.json'),
          path.resolve(__dirname, 'server/stories/**/illustrations/**'),
          path.resolve(__dirname, 'server/uploads/**'),
        ],
      },
    },
  };
});
