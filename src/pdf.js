export async function readPdf(file) {
  let pdfjs = globalThis.__PARAGRAPH_PDFJS__;
  try { pdfjs ||= await import(new URL('./vendor/pdf.mjs', document.baseURI).href); }
  catch { throw new Error('PDF reader could not load. Check your connection and try again.'); }
  pdfjs.GlobalWorkerOptions.workerSrc = globalThis.__PARAGRAPH_PDF_WORKER_URL__ || new URL('./vendor/pdf.worker.mjs', document.baseURI).href;
  let pdf;
  try { pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  catch { throw new Error('Could not open this PDF. It may be damaged or password protected.'); }
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
    if (text) pages.push(text);
  }
  if (!pages.length) throw new Error('No extractable text found. Scanned PDFs need OCR first.');
  return pages.join('\n\n');
}
