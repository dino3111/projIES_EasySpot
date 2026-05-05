import { defineConfig } from 'vite'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      proxy: {
        '/infomatricula': {
          target: 'https://api.infomatricula.pt',
          changeOrigin: true,
          headers: {
            Origin: 'https://infomatricula.pt',
            Referer: 'https://infomatricula.pt/',
          },
          rewrite: (proxyPath) => proxyPath.replace(/^\/infomatricula/, ''),
        },
      },
      host: '0.0.0.0',
      middlewareMode: false,
      allowedHosts: ['localhost', '127.0.0.1', 'frontend'],
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
