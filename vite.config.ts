import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      port: parseInt(process.env.VITE_PORT || '5180'),
      strictPort: false,
    },
    build: {
      // Split large third-party libraries into separate, long-term-cacheable chunks
      // so the main bundle stays small and vendor code is not re-downloaded on every deploy.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
              return 'react-vendor';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
            if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory'))
              return 'charts';
            if (id.includes('framer-motion') || id.includes('/motion-dom/')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor';
          },
        },
      },
    },
  };
});
