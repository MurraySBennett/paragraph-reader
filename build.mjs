import { build } from 'esbuild';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
await mkdir(dist, { recursive: true });
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });
await cp(join(root, 'vendor'), join(dist, 'vendor'), { recursive: true });
await cp(join(root, 'favicon.svg'), join(dist, 'favicon.svg'));
const html = await readFile(join(root, 'index.html'), 'utf8');
await writeFile(join(dist, 'index.html'), html);

const bundled = await build({ entryPoints: [join(root, 'src/app.js')], bundle: true, format: 'iife', platform: 'browser', target: 'es2022', write: false, minify: true });
const js = bundled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = (await readFile(join(root, 'src/styles.css'), 'utf8')).replace(/<\/style/gi, '<\\/style');
const single = html
  .replace('<link rel="stylesheet" href="./src/styles.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="./src/app.js"></script>', () => `<script>${js}</script>`);
await writeFile(join(dist, 'paragraph-reader.html'), single);
console.log('Built dist/index.html and dist/paragraph-reader.html');
