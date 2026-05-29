import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // 开启 CSS 代码分割，按需加载
    cssCodeSplit: true,
    // 分包策略：node_modules 单独打包，长期缓存
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['element-plus'],
          'vendor-map': ['leaflet', 'leaflet.markercluster'],
          'vendor-icons': ['lucide-vue-next'],
        }
      }
    },
    // 生产环境去除 console 和 debugger
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    }
  },
  server: {
    port: 5173,
    open: true,
    headers: {
      'Cache-Control': 'no-store'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
