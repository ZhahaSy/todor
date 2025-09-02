import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
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
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
