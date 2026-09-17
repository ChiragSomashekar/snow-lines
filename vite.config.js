import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/snow-lines/', // github pages serves from /<repo-name>/
  plugins: [react()],
})
