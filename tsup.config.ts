import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  external: ['react', 'react-dom'],
  treeshake: true,
  dts: true,
  platform: 'browser'
});
