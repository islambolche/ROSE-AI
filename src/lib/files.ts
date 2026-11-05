import { FileAttachmentMeta } from '../types';

const CHAR_LIMIT = 12000;
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAMMOTH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

async function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as any).loaded) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    (script as any).loaded = false;
    script.onload = () => {
      (script as any).loaded = true;
      resolve();
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

/**
 * Reads various file types and returns truncated text content.
 */
export async function readFileContent(file: File): Promise<FileAttachmentMeta> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let text = '';

  try {
    if (extension === 'pdf') {
      text = await readPdf(file);
    } else if (extension === 'docx') {
      text = await readDocx(file);
    } else {
      // txt, md, csv, json, etc.
      text = await file.text();
    }
  } catch (err) {
    console.error('[Files] Error reading file:', err);
    throw new Error('ফাইলটি পড়া সম্ভব হয়নি।');
  }

  const isTruncated = text.length > CHAR_LIMIT;
  const content = isTruncated ? text.slice(0, CHAR_LIMIT) : text;

  return {
    name: file.name,
    size: file.size,
    type: file.type || extension || 'unknown',
    content,
    isTruncated,
  };
}

async function readPdf(file: File): Promise<string> {
  await loadScript(PDFJS_URL);
  const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  // Only read up to a reasonable number of pages or until limit reached
  const numPages = Math.min(pdf.numPages, 20);
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
    if (fullText.length > CHAR_LIMIT + 1000) break;
  }

  return fullText;
}

async function readDocx(file: File): Promise<string> {
  await loadScript(MAMMOTH_URL);
  const mammoth = (window as any).mammoth;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Extracts SAVE_FILE signal from Rose's response.
 * Pattern: <<SAVE_FILE name="filename.ext">> content <<END>>
 */
export function extractSaveFileSignal(text: string): { 
  cleanText: string, 
  saveRequest?: { name: string; content: string } 
} {
  const regex = /<<SAVE_FILE\s+name="([^"]+)">>([\s\S]*?)<<END>>/;
  const match = text.match(regex);

  if (match) {
    const name = match[1];
    const content = match[2];
    const cleanText = text.replace(regex, '').trim();
    return {
      cleanText,
      saveRequest: { name, content }
    };
  }

  return { cleanText: text };
}

/**
 * Sanitizes filename and handles extension whitelist.
 * Forbidden chars: / \ .. : * ? " < > |
 */
export function sanitizeFilename(name: string): string {
  let clean = name.replace(/[\/\\:?*"<>|]/g, '_').replace(/\.\./g, '_');
  const parts = clean.split('.');
  const ext = parts.pop()?.toLowerCase() || 'txt';
  const base = parts.join('.') || 'untitled';

  // Whitelist extensions
  const allowed = ['txt', 'md', 'csv', 'json', 'html'];
  const finalExt = allowed.includes(ext) ? ext : 'txt';
  
  return `${base}.${finalExt}`;
}
