import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // @imgly/background-removal 은 wasm/onnx 를 CDN 또는 로컬에서 로드한다.
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
  build: { target: 'es2020' },
});
