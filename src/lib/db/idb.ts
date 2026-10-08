import { Console, Session, Match, Payment, Adjustment, Settings, User } from '@/types';

const DB_NAME = 'ghost_game_zone_idb';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id?: number;
  action: 'START_SESSION' | 'ADD_MATCH' | 'TOGGLE_EXTRA_TIME' | 'UNDO_MATCH' | 'FINISH_SESSION' | 'CREATE_ADJUSTMENT' | 'CLEAR_HISTORY' | 'RESET_REPORTS' | 'UPDATE_SETTINGS' | 'UPDATE_CONSOLE_NAME' | 'TOGGLE_CONSOLE';
  payload: any;
  timestamp: string;
}

export function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('consoles')) {
        db.createObjectStore('consoles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('matches')) {
        db.createObjectStore('matches', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('payments')) {
        db.createObjectStore('payments', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('adjustments')) {
        db.createObjectStore('adjustments', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic IndexedDB Helpers
export async function idbGet<T>(storeName: string, key: string | number): Promise<T | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

export async function idbPut<T>(storeName: string, item: T): Promise<T> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return item;
  }
}

export async function idbDelete(storeName: string, key: string | number): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Ignore error in non-browser context
  }
}

export async function idbClear(storeName: string): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Ignore error
  }
}

// Sync Queue specific functions
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  await idbPut('sync_queue', item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return idbGetAll<SyncQueueItem>('sync_queue');
}

export async function removeFromSyncQueue(id: number): Promise<void> {
  await idbDelete('sync_queue', id);
}

// Seed initial IndexedDB defaults if empty
export async function initIDBDefaults(): Promise<void> {
  if (typeof window === 'undefined') return;

  const consoles = await idbGetAll<Console>('consoles');
  if (consoles.length === 0) {
    const now = new Date().toISOString();
    const defaultConsoles: Console[] = [
      { id: 'c-1', name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true, created_at: now },
      { id: 'c-2', name: 'TV 2', status: 'AVAILABLE', display_order: 2, is_active: true, created_at: now },
      { id: 'c-3', name: 'TV 3', status: 'AVAILABLE', display_order: 3, is_active: true, created_at: now },
    ];
    for (const c of defaultConsoles) {
      await idbPut('consoles', c);
    }
  }

  const settings = await idbGet<Settings>('settings', 'default');
  if (!settings) {
    const defaultSettings: Settings = {
      id: 'default',
      fifa_normal_price: 15.00,
      fifa_extra_time_price: 5.00,
      currency: 'ETB',
      updated_at: new Date().toISOString(),
    };
    await idbPut('settings', defaultSettings);
  }
}
