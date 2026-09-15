import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  server: {
    host: true,
  },
  optimizeDeps: {
    // jeep-sqlite's Emscripten/wasm glue breaks under esbuild's dependency pre-bundling.
    exclude: ['jeep-sqlite'],
  },
  build: {
    // The sql.js/@capacitor-community/sqlite bundle is inherently over Vite's
    // default 500 kB limit; code-splitting it further adds complexity without
    // reducing what the browser has to load on first paint.
    chunkSizeWarningLimit: 600,
  },
})
