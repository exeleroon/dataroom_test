/**
 * Thin promise-based IndexedDB wrapper. This is the only module that talks to
 * the raw IndexedDB API; every service builds on the helpers exported here.
 *
 * Why IndexedDB (not localStorage): uploaded PDFs are binary blobs that can be
 * several MB each — well beyond localStorage's ~5MB string-only budget.
 */

export const DB_NAME = 'dataroom'
export const DB_VERSION = 1

export const STORE = {
  datarooms: 'datarooms',
  items: 'items',
  blobs: 'blobs',
} as const

export type StoreName = (typeof STORE)[keyof typeof STORE]

let dbPromise: Promise<IDBDatabase> | null = null

/** Open (and lazily create) the database. Cached so we open the connection once. */
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE.datarooms)) {
        db.createObjectStore(STORE.datarooms, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE.items)) {
        const items = db.createObjectStore(STORE.items, { keyPath: 'id' })
        // Children are resolved by scanning a dataroom's items in memory, so a
        // single dataroomId index is all we need to keep queries scoped.
        items.createIndex('dataroomId', 'dataroomId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE.blobs)) {
        // Blobs live in their own store keyed by file id, so listing metadata
        // never has to pull megabytes of PDF data into memory.
        db.createObjectStore(STORE.blobs, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

/** Wrap an IDBRequest in a promise. */
function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Run a callback inside a transaction and resolve when it commits. */
async function withStore<T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  run: (stores: Record<string, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  const db = await openDb()
  const names = Array.isArray(storeNames) ? storeNames : [storeNames]

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(names, mode)
    const stores: Record<string, IDBObjectStore> = {}
    for (const name of names) stores[name] = tx.objectStore(name)

    let result: T
    Promise.resolve(run(stores))
      .then((value) => {
        result = value
      })
      .catch((error) => {
        try {
          tx.abort()
        } catch {
          /* already aborting */
        }
        reject(error)
      })

    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

/* ---- Generic CRUD helpers used by the domain services ---- */

export function getAll<T>(store: StoreName): Promise<T[]> {
  return withStore(store, 'readonly', (s) => toPromise(s[store].getAll() as IDBRequest<T[]>))
}

export function getAllByIndex<T>(
  store: StoreName,
  index: string,
  key: IDBValidKey,
): Promise<T[]> {
  return withStore(store, 'readonly', (s) =>
    toPromise(s[store].index(index).getAll(key) as IDBRequest<T[]>),
  )
}

export function get<T>(store: StoreName, id: IDBValidKey): Promise<T | undefined> {
  return withStore(store, 'readonly', (s) => toPromise(s[store].get(id) as IDBRequest<T | undefined>))
}

export function put<T>(store: StoreName, value: T): Promise<T> {
  return withStore(store, 'readwrite', async (s) => {
    await toPromise(s[store].put(value))
    return value
  })
}

export function remove(store: StoreName, id: IDBValidKey): Promise<void> {
  return withStore(store, 'readwrite', async (s) => {
    await toPromise(s[store].delete(id))
  })
}

/** Delete many records across the items + blobs stores in one atomic transaction. */
export function removeMany(itemIds: string[], blobIds: string[]): Promise<void> {
  return withStore([STORE.items, STORE.blobs], 'readwrite', async (s) => {
    await Promise.all([
      ...itemIds.map((id) => toPromise(s[STORE.items].delete(id))),
      ...blobIds.map((id) => toPromise(s[STORE.blobs].delete(id))),
    ])
  })
}

/**
 * Persist a file item and its blob together in a single atomic transaction, so
 * an interrupted upload can never leave an orphaned blob (or an item that points
 * at missing data).
 */
export function putItemWithBlob<T>(item: T, blobId: string, blob: Blob): Promise<void> {
  return withStore([STORE.items, STORE.blobs], 'readwrite', async (s) => {
    await Promise.all([
      toPromise(s[STORE.items].put(item)),
      toPromise(s[STORE.blobs].put({ id: blobId, blob })),
    ])
  })
}
