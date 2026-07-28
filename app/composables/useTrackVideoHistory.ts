export interface TrackVideoExport {
  id: string
  trackId: number
  trackTitle: string
  createdAt: string
  filename: string
  sizeBytes: number
  blob: Blob
}

const DB_NAME = 'bbx-track-videos'
const DB_VERSION = 1
const STORE_NAME = 'exports'
const MAX_EXPORTS_PER_TRACK = 10

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('trackId', 'trackId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = operation(store)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
        transaction.oncomplete = () => db.close()
        transaction.onerror = () => {
          db.close()
          reject(transaction.error ?? new Error('IndexedDB transaction failed'))
        }
      })
  )
}

export async function getExportsForTrack(trackId: number): Promise<TrackVideoExport[]> {
  if (!import.meta.client) return []

  const exports = await withStore('readonly', (store) => store.index('trackId').getAll(trackId))
  return exports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function saveExport(record: TrackVideoExport): Promise<void> {
  if (!import.meta.client) return

  const existing = await getExportsForTrack(record.trackId)
  const sortedOldestFirst = [...existing].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const overflow = sortedOldestFirst.length - MAX_EXPORTS_PER_TRACK + 1
  if (overflow > 0) {
    const toDelete = sortedOldestFirst.slice(0, overflow)
    await Promise.all(toDelete.map((item) => deleteExport(item.id)))
  }

  await withStore('readwrite', (store) => store.put(record))
}

export async function deleteExport(id: string): Promise<void> {
  if (!import.meta.client) return
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearTrackExports(trackId: number): Promise<void> {
  if (!import.meta.client) return

  const exports = await getExportsForTrack(trackId)
  await Promise.all(exports.map((item) => deleteExport(item.id)))
}

export function useTrackVideoHistory() {
  return {
    getExportsForTrack,
    saveExport,
    deleteExport,
    clearTrackExports,
    MAX_EXPORTS_PER_TRACK,
  }
}
