// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <-- Import the 'path' module

export default defineConfig({
  plugins: [react()],
  /* --- ADD THIS SECTION --- */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  /* ------------------------ */
})