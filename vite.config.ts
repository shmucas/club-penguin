import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    // Everything is procedural vector art, so the bundle stays small.
    chunkSizeWarningLimit: 700,
  },
})
