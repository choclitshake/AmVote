import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'crypto', 'path', 'os', 'url', 'string_decoder'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    // Inject synchronous global, process, and Buffer shims in HTML head
    {
      name: 'inject-buffer-shim',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            children: `
              globalThis.global = globalThis.global || globalThis;
              globalThis.process = globalThis.process || { env: {}, version: '', browser: true };
              
              // Minimal Buffer placeholder to satisfy load-time checks/access in pre-bundled third-party modules.
              // This is fully replaced by the real Buffer polyfill in src/polyfills.ts upon application entry.
              if (!globalThis.Buffer) {
                const mockBuffer = function() {};
                mockBuffer.isBuffer = () => false;
                mockBuffer.from = () => ({});
                mockBuffer.alloc = () => ({});
                mockBuffer.allocUnsafe = () => ({});
                mockBuffer.concat = () => ({});
                mockBuffer.prototype = {};
                globalThis.Buffer = mockBuffer;
              }
            `,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})