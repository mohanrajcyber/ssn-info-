import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Required for GitHub Pages project site: https://mohanrajcyber.github.io/ssn-info-/
  base: '/ssn-info-/',
})
