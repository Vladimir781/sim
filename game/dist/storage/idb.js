const DB_NAME = 'colony-sim';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
let dbPromise = null;
export function ensureDb() {
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
export async function saveSlot(slot, payload) {
    const db = await ensureDb();
    const tx = db.transaction(STORE_SAVES, 'readwrite');
    tx.objectStore(STORE_SAVES).put({ slot, payload, createdAt: Date.now() });
    await transactionDone(tx);
}
export async function loadSlot(slot) {
    const db = await ensureDb();
    const tx = db.transaction(STORE_SAVES, 'readonly');
    const req = tx.objectStore(STORE_SAVES).get(slot);
    const result = await requestAsPromise(req);
    await transactionDone(tx);
    return result?.payload;
}
export async function deleteSlot(slot) {
    const db = await ensureDb();
    const tx = db.transaction(STORE_SAVES, 'readwrite');
    tx.objectStore(STORE_SAVES).delete(slot);
    await transactionDone(tx);
}
function transactionDone(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
function requestAsPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
