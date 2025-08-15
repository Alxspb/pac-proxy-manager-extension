class IndexedDBStorage {
  constructor() {
    this.dbName = 'PacProxyManagerDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('pacScripts')) {
          const store = db.createObjectStore('pacScripts', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('enabled', 'enabled', { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  async savePacScripts(scripts) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pacScripts'], 'readwrite');
    const store = transaction.objectStore('pacScripts');

    await store.clear();

    const promises = scripts.map(script => store.add(script));
    
    return Promise.all([
      ...promises,
      new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      })
    ]);
  }

  async getPacScripts() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pacScripts'], 'readonly');
    const store = transaction.objectStore('pacScripts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addPacScript(script) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pacScripts'], 'readwrite');
    const store = transaction.objectStore('pacScripts');

    return new Promise((resolve, reject) => {
      const request = store.add(script);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePacScript(script) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pacScripts'], 'readwrite');
    const store = transaction.objectStore('pacScripts');

    return new Promise((resolve, reject) => {
      const request = store.put(script);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePacScript(scriptId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pacScripts'], 'readwrite');
    const store = transaction.objectStore('pacScripts');

    return new Promise((resolve, reject) => {
      const request = store.delete(scriptId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const indexedDBStorage = new IndexedDBStorage();
export default indexedDBStorage;
