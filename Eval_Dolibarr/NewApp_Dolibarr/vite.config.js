import { defineConfig, loadEnv } from 'vite'
import vue                        from '@vitejs/plugin-vue'
import { fileURLToPath, URL }     from 'node:url'

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')

  return {

    plugins: [vue()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },

    server: {

      port: 5173, // ✅ Port Vite/Vue

      proxy: {
        '/api': {
          target      : 'http://localhost',   // ← juste localhost
          changeOrigin: true,
          rewrite     : (path) => path.replace(/^\/api/, '/dolibarr23/api')
        }
      }
    }
  }
})