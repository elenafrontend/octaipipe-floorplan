import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const src = (path: string) => new URL(`./src/${path}`, import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': src('core'),
      '@modules': src('modules'),
      '@app': src('app'),
    },
  },
});
