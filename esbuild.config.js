import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: false,
  outfile: './build/index.js',
  format: 'esm',
  target: 'es2022',
  loader: { '.html': 'text' },
}).catch(() => process.exit(1));
