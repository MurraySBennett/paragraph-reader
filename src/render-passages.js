import { safeHref } from './passages.js';

function appendRuns(element, runs) {
  const document = element.ownerDocument;
  for (const run of runs) {
    let node = document.createTextNode(run.text);
    if (run.bold) { const strong = document.createElement('strong'); strong.append(node); node = strong; }
    if (run.italic) { const em = document.createElement('em'); em.append(node); node = em; }
    const href = run.href && safeHref(run.href);
    if (href) { const link = document.createElement('a'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(node); node = link; }
    element.append(node);
  }
}

export function renderChunk(container, chunk) {
  const document = container.ownerDocument;
  container.replaceChildren();
  let currentList = null, currentType = null;
  for (const block of chunk.blocks) {
    let element;
    if (block.kind === 'list-item') {
      if (!currentList || currentType !== block.listType) {
        currentType = block.listType;
        currentList = document.createElement(currentType === 'ordered' ? 'ol' : 'ul');
        container.append(currentList);
      }
      element = document.createElement('li');
      currentList.append(element);
    } else {
      currentList = null; currentType = null;
      element = document.createElement(block.kind === 'heading' ? `h${block.level}` : 'p');
      container.append(element);
    }
    element.dataset.anchor = String(block.anchor);
    appendRuns(element, block.runs);
  }
}

export function sourceAnchorForSelection(chunk, selection) {
  if (!selection?.rangeCount) return chunk.start;
  const range = selection.getRangeAt(0);
  const node = range.startContainer.nodeType === 1
    ? range.startContainer.childNodes[range.startOffset] || range.startContainer
    : range.startContainer;
  const element = node.nodeType === 1 ? node : node.parentElement;
  const anchor = element?.closest('[data-anchor]')?.dataset.anchor;
  const index = Number(anchor);
  return Number.isInteger(index) && index >= chunk.start && index <= chunk.end ? index : chunk.start;
}
