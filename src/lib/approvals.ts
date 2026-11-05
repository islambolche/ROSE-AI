import { sanitizeFilename } from './files';
import { SaveFileRequestMeta } from '../types';

const DB_NAME = 'rose_file_system_db';
const STORE_NAME = 'handles';
const LOG_STORE_NAME = 'logs';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
        db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, 'workFolder');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('workFolder');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function removeDirectoryHandle(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete('workFolder');
}

/**
 * Logs a file operation. Keeps last 50.
 */
export async function logFileAction(log: { name: string; size: number; status: string; timestamp: string }): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(LOG_STORE_NAME, 'readwrite');
  const store = tx.objectStore(LOG_STORE_NAME);
  store.add(log);

  // Trim to 50
  const countRequest = store.count();
  countRequest.onsuccess = () => {
    if (countRequest.result > 50) {
      store.openCursor().onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
        }
      };
    }
  };
}

export async function getFileActionLogs(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(LOG_STORE_NAME, 'readonly');
    const store = tx.objectStore(LOG_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.reverse());
  });
}

/**
 * Writes content to the work folder.
 * Handles conflict resolution by renaming.
 * Max 2MB.
 */
export async function writeFileToFolder(
  handle: FileSystemDirectoryHandle,
  name: string,
  content: string
): Promise<string> {
  if (content.length > 2 * 1024 * 1024) {
    throw new Error('ফাইল ২ মেগাবাইটের বেশি বড় হওয়া যাবে না।');
  }

  let cleanName = sanitizeFilename(name);
  const parts = cleanName.split('.');
  const ext = parts.pop();
  const base = parts.join('.');

  let finalName = cleanName;
  let counter = 1;

  // Conflict resolution: find a name that doesn't exist
  while (true) {
    try {
      await handle.getFileHandle(finalName);
      // If no error, file exists
      counter++;
      finalName = `${base} (${counter}).${ext}`;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        break;
      }
      throw err;
    }
  }

  const fileHandle = await handle.getFileHandle(finalName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();

  return finalName;
}

/**
 * Fallback: trigger a browser download.
 */
export function downloadAsFile(name: string, content: string) {
  const cleanName = sanitizeFilename(name);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  a.click();
  URL.revokeObjectURL(url);
}
