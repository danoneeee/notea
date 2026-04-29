import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: {
        '^/(auth\\.v1\\.AuthService|teanotes\\.v1\\.TeaNotesService)/': {
          target: proxyTarget,
          changeOrigin: true,
          ws: false,
        },
      },
    },
  };
});
