import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'pdf/index': 'src/pdf/index.ts',
    'image/index': 'src/image/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'es2020',
  external: ['react', 'react-dom', 'jspdf', 'html-to-image'],
  banner: { js: '"use client";' },
});
