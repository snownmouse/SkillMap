import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_DIFY_API_BASE_URL': JSON.stringify(env.VITE_DIFY_API_BASE_URL),
      'process.env.VITE_DIFY_API_KEY': JSON.stringify(env.VITE_DIFY_API_KEY),
    },
    resolve: {
      alias: {
        // 用 '@/' 而非 '@'，避免误匹配 @tailwindcss/vite 等作用域包（见 issue #4）
        '@/': path.resolve(import.meta.dirname, './src') + '/',
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 3001,
      host: '0.0.0.0',
    },
  };
});
