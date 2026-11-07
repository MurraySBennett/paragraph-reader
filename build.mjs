import { build } from 'esbuild';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';

const root = process.cwd();
const dist = join(root, 'dist');
await mkdir(dist, { recursive: true });
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });
await cp(join(root, 'vendor'), join(dist, 'vendor'), { recursive: true });
await cp(join(root, 'samples'), join(dist, 'samples'), { recursive: true });
await cp(join(root, 'favicon.svg'), join(dist, 'favicon.svg'));
for (const file of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png']) await cp(join(root, file), join(dist, file));
const html = await readFile(join(root, 'index.html'), 'utf8');
await writeFile(join(dist, 'index.html'), html.replace('src="./dist/app.js"', 'src="./app.js"').replace('href="./dist/manifest.webmanifest"', 'href="./manifest.webmanifest"').replace('href="./dist/paragraph-reader-2026-11-07.zip"', 'href="./paragraph-reader-2026-11-07.zip"'));

await build({ entryPoints: [join(root, 'src/import-file.js')], outfile: join(dist, 'import-file.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });

const bundled = await build({ entryPoints: [join(root, 'src/app.js')], bundle: true, format: 'iife', platform: 'browser', target: 'es2022', write: false, minify: true });
const js = bundled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile(join(dist, 'app.js'), bundled.outputFiles[0].text);
const pdfBundle = await build({ entryPoints: [join(root, 'vendor/pdf.mjs')], bundle: true, format: 'iife', globalName: '__PARAGRAPH_PDFJS__', platform: 'browser', target: 'es2022', write: false, minify: true });
const workerData = (await readFile(join(root, 'vendor/pdf.worker.mjs'))).toString('base64');
const fontData = (await readFile(join(root, 'vendor/OpenDyslexic-Regular.woff2'))).toString('base64');
const iconData = (await readFile(join(root, 'favicon.svg'))).toString('base64');
const css = (await readFile(join(root, 'src/styles.css'), 'utf8')).replace("url('../vendor/OpenDyslexic-Regular.woff2')", `url('data:font/woff2;base64,${fontData}')`).replace(/<\/style/gi, '<\\/style');
const sampleNames = ['rainbow-passage.txt', 'human-machine-teams.tex', 'lion-and-mouse.docx', 'la-llave-de-lucia.md', 'dutch-auctions.pdf', 'grin-readme.md'];
const sampleData = Object.fromEntries(await Promise.all(sampleNames.map(async name => [name, (await readFile(join(root, 'samples', name))).toString('base64')])));
const inlineData = `globalThis.__PARAGRAPH_SAMPLES__=${JSON.stringify(sampleData)};globalThis.__PARAGRAPH_PDF_WORKER_URL__=URL.createObjectURL(new Blob([Uint8Array.from(atob(${JSON.stringify(workerData)}),c=>c.charCodeAt(0))],{type:'text/javascript'}));`;
const single = html
  .replace('<link rel="stylesheet" href="./src/styles.css">', () => `<style>${css}</style>`)
  .replace('<link rel="icon" type="image/svg+xml" href="./favicon.svg">', `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${iconData}">`)
  .replace('<link rel="manifest" href="./dist/manifest.webmanifest">', '')
  .replace('<script type="module" src="./dist/app.js"></script>', () => `<script>${pdfBundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script><script>${inlineData}</script><script>${js}</script>`);
await writeFile(join(dist, 'paragraph-reader.html'), single);
const startHere = `Paragraph Reader · 2026-11-07\n\nOpen paragraph-reader.html in a desktop browser. You can import TXT, Markdown, TeX, DOCX, and text-based PDF files, or try the six included examples. No installation, server, or terminal is needed.\n\nNotes may be stored separately in different browsers or when this folder moves. Download a backup from Utilities and restore it when switching copies. Scanned PDFs need OCR before import.\n\nSource: https://github.com/MurraySBennett/paragraph-reader\nSample credits: samples/README.md\n`;
const archive = { 'paragraph-reader.html': strToU8(single), 'START-HERE.txt': strToU8(startHere) };
for (const name of [...sampleNames, 'README.md']) archive[`samples/${name}`] = new Uint8Array(await readFile(join(root, 'samples', name)));
for (const name of ['LICENSE', 'MARKDOWN-IT-LICENSE', 'MAMMOTH-LICENSE', 'PARSE5-LICENSE', 'FFLATE-LICENSE', 'OPENDYSLEXIC-OFL.txt']) archive[`licenses/${name}`] = new Uint8Array(await readFile(join(root, 'vendor', name)));
await writeFile(join(dist, 'paragraph-reader-2026-11-07.zip'), zipSync(archive, { level: 6 }));
const assets = ['./', './index.html', './app.js', './src/styles.css', './vendor/OpenDyslexic-Regular.woff2', './vendor/pdf.mjs', './vendor/pdf.worker.mjs', './favicon.svg', './manifest.webmanifest', './icon-192.png', './icon-512.png', ...['rainbow-passage.txt', 'human-machine-teams.tex', 'lion-and-mouse.docx', 'la-llave-de-lucia.md', 'dutch-auctions.pdf', 'grin-readme.md', 'README.md'].map(file => `./samples/${file}`)];
const hash = createHash('sha256');
for (const asset of assets.slice(1)) hash.update(await readFile(join(dist, asset.slice(2))));
const cacheName = `paragraph-reader-${hash.digest('hex').slice(0, 12)}`;
const sw = (await readFile(join(root, 'src/sw-template.js'), 'utf8')).replace('__CACHE_NAME__', cacheName).replace('__ASSETS__', JSON.stringify(assets));
await writeFile(join(dist, 'sw.js'), sw);
console.log('Built dist/index.html and dist/paragraph-reader.html');
