/**
 * storage.js - IndexedDB Storage Engine for Cinecore
 * Manages persistent document saving, auto-snapshots, and Version History.
 */

const DB_NAME = 'CinecoreScreenplayDB';
const DB_VERSION = 1;
const DOC_STORE = 'documents';
const VERSION_STORE = 'versions';

let dbInstance = null;

export async function getDB() {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(DOC_STORE)) {
                db.createObjectStore(DOC_STORE, { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains(VERSION_STORE)) {
                const versionStore = db.createObjectStore(VERSION_STORE, { keyPath: 'id', autoIncrement: true });
                versionStore.createIndex('timestamp', 'timestamp', { unique: false });
                versionStore.createIndex('documentId', 'documentId', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('IndexedDB open error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Save current screenplay document state
 */
export async function saveDocument(doc) {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DOC_STORE, 'readwrite');
            const store = tx.objectStore(DOC_STORE);

            const record = {
                id: doc.id || 'current_script',
                title: doc.title || '',
                author: doc.author || '',
                source: doc.source || '',
                contact: doc.contact || '',
                content: doc.content || '',
                theme: doc.theme || 'midnight',
                sceneNumbers: !!doc.sceneNumbers,
                entities: doc.entities || null,
                lastModified: Date.now()
            };

            const request = store.put(record);

            request.onsuccess = () => resolve(record);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.warn('Fallback to localStorage on IndexedDB save failure:', err);
        // Fallback to localStorage if IndexedDB is blocked
        localStorage.setItem('cinecore-script', doc.content || '');
        localStorage.setItem('cinecore-tp-title', doc.title || '');
        localStorage.setItem('cinecore-tp-author', doc.author || '');
        localStorage.setItem('cinecore-tp-source', doc.source || '');
        localStorage.setItem('cinecore-tp-contact', doc.contact || '');
        if (doc.entities) {
            try {
                localStorage.setItem('cinecore-entities', JSON.stringify(doc.entities));
            } catch (e) {}
        }
    }
}

/**
 * Load current document state
 */
export async function loadDocument(id = 'current_script') {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(DOC_STORE, 'readonly');
            const store = tx.objectStore(DOC_STORE);
            const request = store.get(id);

            request.onsuccess = (e) => {
                const result = e.target.result;
                if (result) {
                    resolve(result);
                } else {
                    // Check if migrating from localStorage
                    const legacyScript = localStorage.getItem('cinecore-script');
                    if (legacyScript) {
                        let legacyEntities = null;
                        try {
                            legacyEntities = JSON.parse(localStorage.getItem('cinecore-entities') || 'null');
                        } catch (e) {}
                        resolve({
                            id: 'current_script',
                            title: localStorage.getItem('cinecore-tp-title') || '',
                            author: localStorage.getItem('cinecore-tp-author') || '',
                            source: localStorage.getItem('cinecore-tp-source') || '',
                            contact: localStorage.getItem('cinecore-tp-contact') || '',
                            content: legacyScript,
                            theme: localStorage.getItem('cinecore-theme') || 'midnight',
                            sceneNumbers: localStorage.getItem('cinecore-scene-nums') === 'true',
                            entities: legacyEntities,
                            lastModified: Date.now()
                        });
                    } else {
                        resolve(null);
                    }
                }
            };

            request.onerror = () => resolve(null);
        });
    } catch (err) {
        console.warn('Fallback to localStorage on IndexedDB load failure:', err);
        const legacyScript = localStorage.getItem('cinecore-script');
        if (legacyScript) {
            let legacyEntities = null;
            try {
                legacyEntities = JSON.parse(localStorage.getItem('cinecore-entities') || 'null');
            } catch (e) {}
            return {
                id: 'current_script',
                title: localStorage.getItem('cinecore-tp-title') || '',
                author: localStorage.getItem('cinecore-tp-author') || '',
                source: localStorage.getItem('cinecore-tp-source') || '',
                contact: localStorage.getItem('cinecore-tp-contact') || '',
                content: legacyScript,
                theme: localStorage.getItem('cinecore-theme') || 'midnight',
                sceneNumbers: localStorage.getItem('cinecore-scene-nums') === 'true',
                entities: legacyEntities,
                lastModified: Date.now()
            };
        }
        return null;
    }
}

/**
 * Create an immutable snapshot in version history
 */
export async function createVersionSnapshot(versionData) {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(VERSION_STORE, 'readwrite');
            const store = tx.objectStore(VERSION_STORE);

            const record = {
                documentId: versionData.documentId || 'current_script',
                timestamp: Date.now(),
                title: versionData.title || 'Untitled Draft',
                wordCount: versionData.wordCount || 0,
                sceneCount: versionData.sceneCount || 0,
                summary: versionData.summary || 'Auto-saved revision',
                content: versionData.content || ''
            };

            const request = store.add(record);

            request.onsuccess = (e) => {
                record.id = e.target.result;
                resolve(record);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.warn('Failed to create version snapshot:', err);
        return null;
    }
}

/**
 * Get all saved versions for the current script
 */
export async function getVersions(limit = 40) {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(VERSION_STORE, 'readonly');
            const store = tx.objectStore(VERSION_STORE);
            const index = store.index('timestamp');
            const versions = [];

            // Cursor in reverse (most recent first)
            const request = index.openCursor(null, 'prev');

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && versions.length < limit) {
                    versions.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(versions);
                }
            };

            request.onerror = () => resolve([]);
        });
    } catch (err) {
        console.warn('Failed to fetch versions:', err);
        return [];
    }
}

/**
 * Restore a specific version by ID
 */
export async function restoreVersion(versionId) {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(VERSION_STORE, 'readonly');
            const store = tx.objectStore(VERSION_STORE);
            const request = store.get(Number(versionId));

            request.onsuccess = (e) => resolve(e.target.result || null);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        console.error('Failed to restore version:', err);
        return null;
    }
}
