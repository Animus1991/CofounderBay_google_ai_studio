import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// SECURITY: no server secret (GEMINI_API_KEY, Stripe keys, …) is injected into the
// client bundle. AI requests go through the server proxy in server.ts.
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
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : { clientPort: 443, protocol: 'wss' },
      host: true,
      allowedHosts: true,
      port: parseInt(process.env.PORT || process.env.VITE_PORT || '5180'),
      strictPort: false,
    },
    build: {
      // Split large third-party libraries into separate, long-term-cacheable chunks
      // so the main bundle stays small and vendor code is not re-downloaded on every deploy.
      chunkSizeWarningLimit: 900,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
              return 'react-vendor';
            // Loaded only when a file is uploaded or an AI call runs without the proxy.
            if (id.includes('@firebase/storage') || id.includes('firebase/storage')) return 'firebase-storage';
            if (id.includes('@google/genai')) return 'genai';
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
