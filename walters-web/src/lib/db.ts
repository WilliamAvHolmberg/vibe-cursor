const DB_NAME = 'walters-web-db';
const DB_VERSION = 1;
const STORE_NAME = 'characters';
const SETTINGS_STORE = 'settings';

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'character' });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };
  });
};

export const saveCharacterData = async (character: string, data: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ character, ...data });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCharacterData = async (character: string): Promise<any | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(character);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllCharacterData = async (): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSetting = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSetting = async (key: string): Promise<any | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
};

// Migrate from localStorage to IndexedDB
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    // Migrate character data
    const oldCharacters = localStorage.getItem('walters-web-characters');
    if (oldCharacters) {
      const data = JSON.parse(oldCharacters);
      for (const [character, charData] of Object.entries(data)) {
        await saveCharacterData(character, charData);
      }
      localStorage.removeItem('walters-web-characters');
    }

    // Migrate settings
    const oldSettings = localStorage.getItem('walters-web-settings');
    if (oldSettings) {
      const settings = JSON.parse(oldSettings);
      for (const [key, value] of Object.entries(settings)) {
        await saveSetting(key, value);
      }
      localStorage.removeItem('walters-web-settings');
    }
  } catch (error) {
    console.warn('Migration from localStorage failed:', error);
  }
};
