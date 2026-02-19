import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    // lovable-tagger is dev-only and loaded conditionally so production
    // builds on servers without devDependencies don't fail.
    mode === 'development'
      ? (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { componentTagger } = require('lovable-tagger');
            return componentTagger();
          } catch {
            return null;
          }
        })()
      : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
