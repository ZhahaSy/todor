import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        charset: false,
        modifyVars: {
              // 使用这种方式导入 Less 文件，其中包含所有变量
              // 确保 `resolve` 路径正确
              hack: `true; @import "${path.resolve(__dirname, 'src/style/theme.less')}";`,
            },
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        /** 避免 dev 代理缓冲 SSE，长连接不设超时 */
        timeout: 0,
        proxyTimeout: 0,
      }
    }
  }
})
