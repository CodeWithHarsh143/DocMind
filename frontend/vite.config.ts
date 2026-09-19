/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/organizations': 'http://localhost:8000',
      '/documents': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/sessions': 'http://localhost:8000',
      '/api/invite': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
  },
})
