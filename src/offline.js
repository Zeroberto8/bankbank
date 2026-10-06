// Offline-Speicher in IndexedDB:
// - "outbox": neue Bänke/Kommentare (inkl. Foto-Blobs), die noch hochgeladen
//   werden müssen, z. B. weil im Funkloch kein Empfang war
// - "cache":  zuletzt geladene Daten (Bänke, Wanderwege) für die Offline-Anzeige

const DB_NAME = "bankbank-offline";
let dbPromise = null;

const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("outbox", { keyPath: "key", autoIncrement: true });
        db.createObjectStore("cache");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
};

const run = async (store, mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const outboxAdd = (item) => run("outbox", "readwrite", s => s.add(item));
export const outboxPut = (item) => run("outbox", "readwrite", s => s.put(item));
export const outboxDelete = (key) => run("outbox", "readwrite", s => s.delete(key));
export const outboxAll = () => run("outbox", "readonly", s => s.getAll());

export const cacheGet = (key) => run("cache", "readonly", s => s.get(key));
export const cacheSet = (key, value) => run("cache", "readwrite", s => s.put(value, key));
