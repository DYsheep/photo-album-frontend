import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // 开启 CSS 代码分割，按需加载
    cssCodeSplit: true,
    // 分包策略：第三方库单独打包，长期缓存
    rollupOptions: {
      output: {
        // 这里必须用函数形式，不能写成 { 'vendor-ui': ['element-plus'] }：
        // 数组形式会把该包当成独立的 chunk 入口，等于强制保留它的全部导出，
        // 让"按需引入"完全失效（实测 vendor-ui 仍是 900KB）。
        // 函数形式只对"已经进入依赖图"的模块分组，未使用的组件会被 tree-shaking 掉。
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('element-plus')) return 'vendor-ui'
          if (id.includes('leaflet')) return 'vendor-map'
          if (id.includes('lucide-vue-next')) return 'vendor-icons'
          if (/node_modules[\\/](vue|@vue|vue-router|pinia)[\\/]/.test(id)) return 'vendor-vue'
          return undefined
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
