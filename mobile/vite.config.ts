import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './', // 移动端 WebView 相对路径加载关键配置
  plugins: [react(), tailwindcss()],
  build: {
    target: ['chrome80', 'es2020'],
    outDir: 'dist/app',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // 支持局域网手机真机通过 WiFi 实时预览
  },
});
