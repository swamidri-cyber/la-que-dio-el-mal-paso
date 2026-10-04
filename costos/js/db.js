/* Almacenamiento local en IndexedDB. Nada sale del dispositivo.
   Stores:
     insumos   -> { id, nombre, precio(centavos), cantidad, unidad, categoria, proveedor, nota, historial[], actualizado }
     productos -> { id, nombre, rinde, minutos, merma, items[], ventasMin, ventasMay, precioMin, precioMay, ... }
     kv        -> configuración { key, value } (taller, fijos, medios, combos, settings) */
(function () {
  'use strict';

  const DB_NAME = 'costos-lqdemp';
  const DB_VERSION = 1;
  const STORES = ['insumos', 'productos', 'kv'];
  let dbp = null;
  let memory = null; // respaldo en memoria si IndexedDB no está disponible

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('sin indexedDB')); return; }
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('insumos')) db.createObjectStore('insumos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('productos')) db.createObjectStore('productos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('base bloqueada'));
    }).catch(err => {
      console.warn('IndexedDB no disponible, uso memoria:', err);
      memory = { insumos: new Map(), productos: new Map(), kv: new Map() };
      return null;
    });
    return dbp;
  }

  function reqP(r) {
    return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  }

  function run(stores, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode);
      let result;
      Promise.resolve(fn(t)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('transacción abortada'));
    }));
  }

  const keyOf = (store, row) => store === 'kv' ? row.key : row.id;

  const DB = {
    isMemory() { return !!memory; },

    async all(store) {
      await open();
      if (memory) return [...memory[store].values()];
      return run(store, 'readonly', t => reqP(t.objectStore(store).getAll()));
    },
    async put(store, row) {
      await open();
      if (memory) { memory[store].set(keyOf(store, row), row); return row; }
      await run(store, 'readwrite', t => { t.objectStore(store).put(row); });
      return row;
    },
    async putMany(store, rows) {
      await open();
      if (memory) { rows.forEach(r => memory[store].set(keyOf(store, r), r)); return; }
      await run(store, 'readwrite', t => { const s = t.objectStore(store); rows.forEach(r => s.put(r)); });
    },
    async del(store, id) {
      await open();
      if (memory) { memory[store].delete(id); return; }
      await run(store, 'readwrite', t => { t.objectStore(store).delete(id); });
    },

    async get(key, fallback) {
      await open();
      if (memory) return memory.kv.has(key) ? memory.kv.get(key).value : fallback;
      const row = await run('kv', 'readonly', t => reqP(t.objectStore('kv').get(key)));
      return row ? row.value : fallback;
    },
    set(key, value) { return DB.put('kv', { key, value }); },

    /** Reemplaza TODO (para importar una copia o cargar el ejemplo). data: { insumos, productos, kv } */
    async replaceAll(data) {
      await open();
      if (memory) {
        STORES.forEach(st => { memory[st] = new Map((data[st] || []).map(r => [keyOf(st, r), r])); });
        return;
      }
      await run(STORES, 'readwrite', t => {
        STORES.forEach(st => {
          const s = t.objectStore(st);
          s.clear();
          (data[st] || []).forEach(r => s.put(r));
        });
      });
    },

    /** Pide al navegador que no borre los datos si falta espacio */
    async persist() {
      try {
        if (navigator.storage && navigator.storage.persist) {
          if (await navigator.storage.persisted()) return true;
          return await navigator.storage.persist();
        }
      } catch (e) { /* sin soporte */ }
      return false;
    }
  };

  window.DB = DB;
})();
