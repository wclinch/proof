const DB_NAME = 'proof-files'
const PDF_STORE = 'pdfs'
const VERSION  = 2

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(PDF_STORE)) db.createObjectStore(PDF_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function storeFile(id: string, file: File): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(PDF_STORE, 'readwrite').objectStore(PDF_STORE).put(file, id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

export async function getFile(id: string): Promise<File | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(PDF_STORE, 'readonly').objectStore(PDF_STORE).get(id)
    req.onsuccess = () => resolve((req.result as File) ?? null)
    req.onerror   = () => reject(req.error)
  })
}

export async function deleteFile(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(PDF_STORE, 'readwrite').objectStore(PDF_STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}
