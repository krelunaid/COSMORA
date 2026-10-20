import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const root = fileURLToPath(new URL('.', import.meta.url));
const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The mobile build uses the same screens, but bundles its own router and assets.
// Only these public values can be substituted into the client bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, 'NEXT_PUBLIC_');
  return {
    root: resolve('./mobile'),
    publicDir: resolve('./public'),
    envDir: root,
    plugins: [react()],
    css: { postcss: { plugins: [tailwindcss()] } },
    resolve: { alias: [
      { find: /^next\/navigation$/, replacement: resolve('./mobile/navigation.tsx') },
      { find: /^next\/link$/, replacement: resolve('./mobile/link.tsx') },
      { find: /^next\/image$/, replacement: resolve('./mobile/image.tsx') },
      { find: '@', replacement: root },
    ] },
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
      'process.env.NEXT_PUBLIC_MOBILE_BUILD': JSON.stringify('true'),
    },
    build: { outDir: resolve('./dist/mobile'), emptyOutDir: true, target: 'safari16.4', sourcemap: false },
    server: { host: '127.0.0.1', port: 4319, strictPort: true,
      proxy: { '/api': { target: 'https://cosmora.kreluna.it', changeOrigin: true } } },
    preview: { host: '127.0.0.1', port: 4319, strictPort: true,
      proxy: { '/api': { target: 'https://cosmora.kreluna.it', changeOrigin: true } } },
  };
});
