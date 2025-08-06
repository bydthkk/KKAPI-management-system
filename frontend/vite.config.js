import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../public',  // 构建输出到根目录的public目录
    emptyOutDir: false,   // 不清空目录，保留其他文件
    minify: false,        // 禁用压缩，保留调试代码
    sourcemap: true       // 生成源码映射
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})