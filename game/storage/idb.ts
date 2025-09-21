export interface SaveData {
  slot: string;
  payload: unknown;
  createdAt: number;
}

const DB_NAME = 'colony-sim';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';

let dbPromise: Promise<IDBDatabase> | null = null;

export function ensureDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES, { keyPath: 'slot' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function saveSlot(slot: string, payload: unknown): Promise<void> {
  const db = await ensureDb();
  const tx = db.transaction(STORE_SAVES, 'readwrite');
  tx.objectStore(STORE_SAVES).put({ slot, payload, createdAt: Date.now() });
  await transactionDone(tx);
}

export async function loadSlot<T>(slot: string): Promise<T | undefined> {
  const db = await ensureDb();
  const tx = db.transaction(STORE_SAVES, 'readonly');
  const req = tx.objectStore(STORE_SAVES).get(slot);
  const result = await requestAsPromise<SaveData | undefined>(req);
  await transactionDone(tx);
  return result?.payload as T | undefined;
}

export async function deleteSlot(slot: string): Promise<void> {
  const db = await ensureDb();
  const tx = db.transaction(STORE_SAVES, 'readwrite');
  tx.objectStore(STORE_SAVES).delete(slot);
  await transactionDone(tx);
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
