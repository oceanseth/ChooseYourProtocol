import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ChooseYourProtocol frontend — single-page React app.
// Built to dist/ and synced to the S3 bucket served by CloudFront.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    strictPort: true,
    // Proxy API calls to the local Lambda dev server during development.
    // API_PORT lets both sides move off 3001 when another project holds it.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3001}`,
        changeOrigin: true
      }
    }
  }
});
