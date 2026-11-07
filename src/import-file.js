import { parsePlain } from './passages.js';
import { parseMarkdown } from './markdown.js';
import { parseTex } from './tex.js';
import { parseDocx } from './docx.js';
import { readPdf } from './pdf.js';

export async function importFile(file) {
  const name = String(file?.name || 'File');
  const suffix = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (suffix === '.doc') throw new Error('Older .doc files need conversion: save this file as .docx in Word or LibreOffice, then open it here.');
  if (suffix === '.docx') return parseDocx(file);
  if (suffix === '.pdf') return parsePlain(await readPdf(file), name);
  const text = await file.text();
  if (suffix === '.md' || suffix === '.markdown') return parseMarkdown(text, name);
  if (suffix === '.tex' || suffix === '.ltx') return parseTex(text, name);
  if (suffix === '.txt') return parsePlain(text, name);
  throw new Error('Open a TXT, Markdown, TeX, DOCX, or text-based PDF file.');
}
