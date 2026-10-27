import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'NEXT_PUBLIC_');
  return {
    root,
    base: '/cosmora/admin/',
    publicDir: 'public',
    envDir: projectRoot,
    plugins: [react()],
    define: {
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      ),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      ),
    },
    build: { outDir: '../dist/admin-web', emptyOutDir: true },
    server: { host: '127.0.0.1', port: 4330, strictPort: true },
    preview: { host: '127.0.0.1', port: 4330, strictPort: true },
  };
});
