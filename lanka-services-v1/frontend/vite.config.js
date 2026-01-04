import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // simple-peer සඳහා අවශ්‍ය සියලුම Node.js modules ලබා දීම
      include: ['events', 'util', 'stream', 'buffer', 'process'], 
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // util සහ events හරියටම Browser එකට ගලපන්න
      util: 'util',
      events: 'events',
    },
  },
})