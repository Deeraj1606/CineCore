/**
 * store.js — IndexedDB v3 Data Layer for CINECORE (Absolute Cinema)
 * Manages persistent normalized entities:
 * projects, screenplays, scenes, characters, locations,
 * breakdownItems, storyboards, shots, shootDays, schedules,
 * callSheets, moodboardItems, tasks, activityLogs, seasons, episodes,
 * documents, assets, versions, settings.
 */

const DB_NAME = 'CinecoreDB';
const DB_VERSION = 4;

export const STORES = {
    projects: 'projects',
    seasons: 'seasons',
    episodes: 'episodes',
    screenplays: 'screenplays',
    scenes: 'scenes',
    characters: 'characters',
    locations: 'locations',
    breakdownItems: 'breakdownItems',
    storyboards: 'storyboards',
    shots: 'shots',
    shootDays: 'shootDays',
    schedules: 'schedules',
    callSheets: 'callSheets',
    moodboardItems: 'moodboardItems',
    tasks: 'tasks',
    activityLogs: 'activityLogs',
    documents: 'documents',
    assets: 'assets',
    versions: 'versions',
    settings: 'settings',
    analysisCandidates: 'analysisCandidates',
    scriptTags: 'scriptTags',
    events: 'events'
};

let dbInstance = null;

/** Generate a compact, stable, collision-free unique ID */
export function generateId(prefix = '') {
    const p = prefix ? `${prefix}_` : '';
    return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Open or upgrade the database */
export async function openDB() {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Helper to ensure store exists
            const ensureStore = (name, keyPath = 'id', indexes = []) => {
                let store;
                if (!db.objectStoreNames.contains(name)) {
                    store = db.createObjectStore(name, { keyPath });
                } else {
                    store = event.target.transaction.objectStore(name);
                }
                indexes.forEach(([idxName, key, opts]) => {
                    if (!store.indexNames.contains(idxName)) {
                        store.createIndex(idxName, key, opts || { unique: false });
                    }
                });
                return store;
            };

            // V1 & V2 Stores
            ensureStore(STORES.projects, 'id', [
                ['type', 'type'],
                ['updatedAt', 'updatedAt'],
                ['pinned', 'pinned']
            ]);

            ensureStore(STORES.seasons, 'id', [
                ['projectId', 'projectId'],
                ['order', 'order']
            ]);

            ensureStore(STORES.episodes, 'id', [
                ['projectId', 'projectId'],
                ['seasonId', 'seasonId'],
                ['order', 'order']
            ]);

            ensureStore(STORES.screenplays, 'id', [
                ['projectId', 'projectId'],
                ['episodeId', 'episodeId']
            ]);

            ensureStore(STORES.characters, 'id', [
                ['projectId', 'projectId'],
                ['name', 'name']
            ]);

            ensureStore(STORES.locations, 'id', [
                ['projectId', 'projectId'],
                ['name', 'name']
            ]);

            ensureStore(STORES.documents, 'id', [
                ['projectId', 'projectId'],
                ['type', 'type']
            ]);

            ensureStore(STORES.assets, 'id', [
                ['projectId', 'projectId']
            ]);

            ensureStore(STORES.versions, 'id', [
                ['screenplayId', 'screenplayId'],
                ['timestamp', 'timestamp']
            ]);

            ensureStore(STORES.settings, 'key');

            // V3 New Normalized Stores for Dynamic Linking
            ensureStore(STORES.scenes, 'id', [
                ['projectId', 'projectId'],
                ['screenplayId', 'screenplayId'],
                ['sceneNumber', 'sceneNumber'],
                ['locationId', 'locationId']
            ]);

            ensureStore(STORES.breakdownItems, 'id', [
                ['projectId', 'projectId'],
                ['sceneId', 'sceneId'],
                ['category', 'category']
            ]);

            ensureStore(STORES.storyboards, 'id', [
                ['projectId', 'projectId'],
                ['sceneId', 'sceneId'],
                ['shotId', 'shotId'],
                ['order', 'order']
            ]);

            ensureStore(STORES.shots, 'id', [
                ['projectId', 'projectId'],
                ['sceneId', 'sceneId'],
                ['order', 'order']
            ]);

            ensureStore(STORES.shootDays, 'id', [
                ['projectId', 'projectId'],
                ['dayNumber', 'dayNumber'],
                ['date', 'date']
            ]);

            ensureStore(STORES.schedules, 'id', [
                ['projectId', 'projectId'],
                ['shootDayId', 'shootDayId'],
                ['sceneId', 'sceneId'],
                ['order', 'order']
            ]);

            ensureStore(STORES.callSheets, 'id', [
                ['projectId', 'projectId'],
                ['shootDayId', 'shootDayId']
            ]);

            ensureStore(STORES.moodboardItems, 'id', [
                ['projectId', 'projectId'],
                ['category', 'category'],
                ['linkedEntityId', 'linkedEntityId']
            ]);

            ensureStore(STORES.tasks, 'id', [
                ['projectId', 'projectId'],
                ['status', 'status'],
                ['relatedEntityId', 'relatedEntityId']
            ]);

            ensureStore(STORES.activityLogs, 'id', [
                ['projectId', 'projectId'],
                ['entityType', 'entityType'],
                ['timestamp', 'timestamp']
            ]);

            ensureStore(STORES.analysisCandidates, 'id', [
                ['projectId', 'projectId'],
                ['screenplayId', 'screenplayId'],
                ['entityType', 'entityType'],
                ['status', 'status']
            ]);

            ensureStore(STORES.scriptTags, 'id', [
                ['projectId', 'projectId'],
                ['screenplayId', 'screenplayId'],
                ['tagType', 'tagType'],
                ['sceneId', 'sceneId']
            ]);

            ensureStore(STORES.events, 'id', [
                ['projectId', 'projectId'],
                ['screenplayId', 'screenplayId'],
                ['sceneId', 'sceneId'],
                ['category', 'category']
            ]);

            console.log('[Store] CinecoreDB upgraded to version', DB_VERSION);
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('[Store] Failed to open database:', event.target.error);
            reject(event.target.error);
        };
    });
}

// ─── Generic CRUD ─────────────────────────────────────────────────────────────

async function _put(storeName, record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function _get(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = (e) => resolve(e.target.result || null);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function _getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = (e) => resolve(e.target.result || []);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function _getAllByIndex(storeName, indexName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.getAll(value);
        req.onsuccess = (e) => resolve(e.target.result || []);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function _delete(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e.target.error);
    });
}

// ─── Entity Modules ──────────────────────────────────────────────────────────

export const projects = {
    async create(data) {
        const now = Date.now();
        const project = {
            id: generateId('prj'),
            name: data.name || 'Untitled Project',
            type: data.type || 'film', // film | short | web-series | tv-series | custom
            genre: data.genre || '',
            logline: data.logline || '',
            status: data.status || 'development',
            coverColor: data.coverColor || '#713BFF',
            pinned: data.pinned || false,
            createdAt: now,
            updatedAt: now,
            settings: data.settings || {}
        };
        await _put(STORES.projects, project);
        return project;
    },
    async get(id) { return _get(STORES.projects, id); },
    async getAll() {
        const all = await _getAll(STORES.projects);
        return all.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async update(id, changes) {
        const existing = await _get(STORES.projects, id);
        if (!existing) throw new Error(`Project ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.projects, updated);
        return updated;
    },
    async delete(id) {
        // Cascade delete all child entities to prevent IndexedDB orphans
        const [sList, scrList, scList, chrList, locList, brkList, stbList, shtList, dayList, schedList, csList, mbList, tskList, logList, candList, tagList, evtList, docList] = await Promise.all([
            seasons.getByProject(id),
            screenplays.getByProject(id),
            scenes.getByProject(id),
            characters.getByProject(id),
            locations.getByProject(id),
            breakdownItems.getByProject(id),
            storyboards.getByProject(id),
            shots.getByProject(id),
            shootDays.getByProject(id),
            schedules.getByProject(id),
            callSheets.getByProject(id),
            moodboards.getByProject(id),
            tasks.getByProject(id),
            _getAllByIndex(STORES.activityLogs, 'projectId', id),
            analysisCandidates.getByProject(id),
            scriptTags.getByProject(id),
            events.getByProject(id),
            documents.getByProject(id)
        ]);
        const deleteAll = (list, fn) => Promise.all(list.map(item => fn(item.id)));
        await Promise.all([
            deleteAll(sList,     s => _delete(STORES.seasons, s)),
            deleteAll(scrList,   s => _delete(STORES.screenplays, s)),
            deleteAll(scList,    s => _delete(STORES.scenes, s)),
            deleteAll(chrList,   s => _delete(STORES.characters, s)),
            deleteAll(locList,   s => _delete(STORES.locations, s)),
            deleteAll(brkList,   s => _delete(STORES.breakdownItems, s)),
            deleteAll(stbList,   s => _delete(STORES.storyboards, s)),
            deleteAll(shtList,   s => _delete(STORES.shots, s)),
            deleteAll(dayList,   s => _delete(STORES.shootDays, s)),
            deleteAll(schedList, s => _delete(STORES.schedules, s)),
            deleteAll(csList,    s => _delete(STORES.callSheets, s)),
            deleteAll(mbList,    s => _delete(STORES.moodboardItems, s)),
            deleteAll(tskList,   s => _delete(STORES.tasks, s)),
            deleteAll(logList,   s => _delete(STORES.activityLogs, s)),
            deleteAll(candList,  s => _delete(STORES.analysisCandidates, s)),
            deleteAll(tagList,   s => _delete(STORES.scriptTags, s)),
            deleteAll(evtList,   s => _delete(STORES.events, s)),
            deleteAll(docList,   s => _delete(STORES.documents, s))
        ]);
        return _delete(STORES.projects, id);
    }
};

export const screenplays = {
    async create(data) {
        const now = Date.now();
        const screenplay = {
            id: generateId('scr'),
            projectId: data.projectId,
            episodeId: data.episodeId || null,
            title: data.title || 'Screenplay Draft',
            content: data.content || '',
            wordCount: data.wordCount || 0,
            sceneCount: data.sceneCount || 0,
            lastModified: now,
            createdAt: now
        };
        await _put(STORES.screenplays, screenplay);
        return screenplay;
    },
    async get(id) { return _get(STORES.screenplays, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.screenplays, 'projectId', projectId);
    },
    async getForProject(projectId) {
        const all = await _getAllByIndex(STORES.screenplays, 'projectId', projectId);
        return all.find(sp => !sp.episodeId) || all[0] || null;
    },
    async getByEpisode(episodeId) {
        const all = await _getAllByIndex(STORES.screenplays, 'episodeId', episodeId);
        return all[0] || null;
    },
    async update(id, changes) {
        const existing = await _get(STORES.screenplays, id);
        if (!existing) throw new Error(`Screenplay ${id} not found`);
        const updated = { ...existing, ...changes, lastModified: Date.now() };
        await _put(STORES.screenplays, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.screenplays, id); }
};

// ─── SCENES (First-Class Stable Entity) ────────────────────────────────────────

export const scenes = {
    async create(data) {
        const now = Date.now();
        const scene = {
            id: data.id || generateId('scn'), // Keep stable ID
            projectId: data.projectId,
            screenplayId: data.screenplayId,
            sceneNumber: data.sceneNumber || 1,
            heading: (data.heading || 'INT. SCENE - DAY').trim(),
            intExt: data.intExt || (data.heading?.toUpperCase().startsWith('EXT') ? 'EXT.' : 'INT.'),
            timeOfDay: data.timeOfDay || 'DAY',
            locationId: data.locationId || null,
            locationName: data.locationName || '',
            characterIds: data.characterIds || [], // Array of stable character IDs
            summary: data.summary || '',
            scriptExcerpt: data.scriptExcerpt || '',
            estPages: data.estPages || '1/8',
            estMinutes: data.estMinutes || 2,
            status: data.status || 'draft', // draft | revised | locked | shot
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.scenes, scene);
        return scene;
    },
    async get(id) { return _get(STORES.scenes, id); },
    async getByProject(projectId) {
        const list = await _getAllByIndex(STORES.scenes, 'projectId', projectId);
        return list.sort((a, b) => a.sceneNumber - b.sceneNumber);
    },
    async getByScreenplay(screenplayId) {
        const list = await _getAllByIndex(STORES.scenes, 'screenplayId', screenplayId);
        return list.sort((a, b) => a.sceneNumber - b.sceneNumber);
    },
    async update(id, changes) {
        const existing = await _get(STORES.scenes, id);
        if (!existing) throw new Error(`Scene ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.scenes, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.scenes, id); }
};

// ─── CHARACTERS ───────────────────────────────────────────────────────────────

export const characters = {
    async create(data) {
        const now = Date.now();
        const character = {
            id: generateId('chr'),
            projectId: data.projectId,
            name: (data.name || '').toUpperCase().trim(),
            fullName: data.fullName || '',
            age: data.age || '',
            role: data.role || 'Supporting', // Protagonist | Antagonist | Supporting | Minor
            actorName: data.actorName || '',
            contact: data.contact || '',
            bio: data.bio || '',
            goals: data.goals || '',
            need: data.need || '',
            flaw: data.flaw || '',
            fear: data.fear || '',
            physical: data.physical || '',
            wardrobe: data.wardrobe || '',
            speechPattern: data.speechPattern || '',
            verbalTics: data.verbalTics || '',
            sampleDialogue: data.sampleDialogue || '',
            relationships: data.relationships || '',
            arc: data.arc || '',
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.characters, character);
        return character;
    },
    async get(id) { return _get(STORES.characters, id); },
    async getByProject(projectId) {
        const all = await _getAllByIndex(STORES.characters, 'projectId', projectId);
        return all.sort((a, b) => a.name.localeCompare(b.name));
    },
    async update(id, changes) {
        const existing = await _get(STORES.characters, id);
        if (!existing) throw new Error(`Character ${id} not found`);
        if (changes.name) changes.name = changes.name.toUpperCase().trim();
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.characters, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.characters, id); }
};

// ─── LOCATIONS ────────────────────────────────────────────────────────────────

export const locations = {
    async create(data) {
        const now = Date.now();
        const location = {
            id: generateId('loc'),
            projectId: data.projectId,
            name: (data.name || '').toUpperCase().trim(),
            type: data.type || 'INT.',
            region: data.region || '',
            address: data.address || '',
            contact: data.contact || '',
            atmosphere: data.atmosphere || '',
            sound: data.sound || '',
            description: data.description || '',
            scoutingNotes: data.scoutingNotes || '',
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.locations, location);
        return location;
    },
    async get(id) { return _get(STORES.locations, id); },
    async getByProject(projectId) {
        const all = await _getAllByIndex(STORES.locations, 'projectId', projectId);
        return all.sort((a, b) => a.name.localeCompare(b.name));
    },
    async update(id, changes) {
        const existing = await _get(STORES.locations, id);
        if (!existing) throw new Error(`Location ${id} not found`);
        if (changes.name) changes.name = changes.name.toUpperCase().trim();
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.locations, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.locations, id); }
};

// ─── BREAKDOWN ITEMS ──────────────────────────────────────────────────────────

export const breakdownItems = {
    async create(data) {
        const now = Date.now();
        const item = {
            id: generateId('bdk'),
            projectId: data.projectId,
            sceneId: data.sceneId, // Stable link to scene
            category: data.category || 'props', // props | wardrobe | vehicles | stunts | vfx | sfx | sound | special_equipment
            name: data.name || '',
            description: data.description || '',
            characterId: data.characterId || null, // Optional link to character (e.g. wardrobe/prop)
            status: data.status || 'needed', // needed | sourced | on_set | wrapped
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.breakdownItems, item);
        return item;
    },
    async get(id) { return _get(STORES.breakdownItems, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.breakdownItems, 'projectId', projectId);
    },
    async getByScene(sceneId) {
        return _getAllByIndex(STORES.breakdownItems, 'sceneId', sceneId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.breakdownItems, id);
        if (!existing) throw new Error(`Breakdown item ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.breakdownItems, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.breakdownItems, id); }
};

// ─── STORYBOARDS ──────────────────────────────────────────────────────────────

export const storyboards = {
    async create(data) {
        const now = Date.now();
        const frame = {
            id: generateId('stb'),
            projectId: data.projectId,
            sceneId: data.sceneId || null, // Linked scene
            shotId: data.shotId || null,   // Optional linked shot
            order: data.order || 1,
            frameNumber: data.frameNumber || 1,
            imageUrl: data.imageUrl || '',
            svgDrawing: data.svgDrawing || '',
            description: data.description || '',
            shotSize: data.shotSize || 'WS', // WS | MS | MCU | CU | ECU | OTS | POV
            cameraAngle: data.cameraAngle || 'Eye Level', // Eye Level | High Angle | Low Angle | Dutch | Aerial
            movement: data.movement || 'Static', // Static | Pan | Tilt | Dolly | Track | Handheld | Crane
            duration: data.duration || '3s',
            soundNote: data.soundNote || '',
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.storyboards, frame);
        return frame;
    },
    async get(id) { return _get(STORES.storyboards, id); },
    async getByProject(projectId) {
        const list = await _getAllByIndex(STORES.storyboards, 'projectId', projectId);
        return list.sort((a, b) => a.order - b.order);
    },
    async getByScene(sceneId) {
        const list = await _getAllByIndex(STORES.storyboards, 'sceneId', sceneId);
        return list.sort((a, b) => a.order - b.order);
    },
    async update(id, changes) {
        const existing = await _get(STORES.storyboards, id);
        if (!existing) throw new Error(`Storyboard ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.storyboards, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.storyboards, id); }
};

// ─── SHOTS & SHOT LIST ────────────────────────────────────────────────────────

export const shots = {
    async create(data) {
        const now = Date.now();
        const shot = {
            id: generateId('sht'),
            projectId: data.projectId,
            sceneId: data.sceneId, // Stable linked scene
            frameId: data.frameId || null, // Linked storyboard frame
            shotNumber: data.shotNumber || '1A',
            order: data.order || 1,
            shotSize: data.shotSize || 'WS',
            angle: data.angle || 'Eye Level',
            movement: data.movement || 'Static',
            lens: data.lens || '35mm',
            camera: data.camera || 'A Camera',
            description: data.description || '',
            action: data.action || '',
            equipment: data.equipment || '',
            soundNotes: data.soundNotes || '',
            status: data.status || 'planned', // planned | setup | shot | cut
            scheduleDayId: data.scheduleDayId || null,
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.shots, shot);
        return shot;
    },
    async get(id) { return _get(STORES.shots, id); },
    async getByProject(projectId) {
        const list = await _getAllByIndex(STORES.shots, 'projectId', projectId);
        return list.sort((a, b) => a.order - b.order);
    },
    async getByScene(sceneId) {
        const list = await _getAllByIndex(STORES.shots, 'sceneId', sceneId);
        return list.sort((a, b) => a.order - b.order);
    },
    async update(id, changes) {
        const existing = await _get(STORES.shots, id);
        if (!existing) throw new Error(`Shot ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.shots, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.shots, id); }
};

// ─── SHOOT DAYS & PRODUCTION SCHEDULE ─────────────────────────────────────────

export const shootDays = {
    async create(data) {
        const now = Date.now();
        const day = {
            id: generateId('day'),
            projectId: data.projectId,
            dayNumber: data.dayNumber || 1,
            date: data.date || new Date().toISOString().split('T')[0],
            title: data.title || `Day ${data.dayNumber || 1}`,
            callTime: data.callTime || '07:00',
            estimatedWrap: data.estimatedWrap || '19:00',
            locationId: data.locationId || null,
            locationName: data.locationName || '',
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.shootDays, day);
        return day;
    },
    async get(id) { return _get(STORES.shootDays, id); },
    async getByProject(projectId) {
        const list = await _getAllByIndex(STORES.shootDays, 'projectId', projectId);
        return list.sort((a, b) => a.dayNumber - b.dayNumber);
    },
    async update(id, changes) {
        const existing = await _get(STORES.shootDays, id);
        if (!existing) throw new Error(`ShootDay ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.shootDays, updated);
        return updated;
    },
    async delete(id) {
        // Unlink schedule entries for this day
        const scheds = await schedules.getByShootDay(id);
        for (const s of scheds) {
            await schedules.delete(s.id);
        }
        return _delete(STORES.shootDays, id);
    }
};

export const schedules = {
    async create(data) {
        const now = Date.now();
        const entry = {
            id: generateId('sch'),
            projectId: data.projectId,
            shootDayId: data.shootDayId,
            sceneId: data.sceneId, // Stable scene ID
            order: data.order || 1,
            estMinutes: data.estMinutes || 60,
            independentNotes: data.independentNotes || '', // User notes preserved across scene edits
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.schedules, entry);
        return entry;
    },
    async get(id) { return _get(STORES.schedules, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.schedules, 'projectId', projectId);
    },
    async getByShootDay(shootDayId) {
        const list = await _getAllByIndex(STORES.schedules, 'shootDayId', shootDayId);
        return list.sort((a, b) => a.order - b.order);
    },
    async getByScene(sceneId) {
        return _getAllByIndex(STORES.schedules, 'sceneId', sceneId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.schedules, id);
        if (!existing) throw new Error(`Schedule ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.schedules, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.schedules, id); }
};

// ─── CALL SHEETS (Draft vs Published States) ───────────────────────────────────

export const callSheets = {
    async create(data) {
        const now = Date.now();
        const sheet = {
            id: generateId('cls'),
            projectId: data.projectId,
            shootDayId: data.shootDayId,
            title: data.title || 'Production Call Sheet',
            version: data.version || 1, // e.g. Rev 1, Rev 2
            isPublished: data.isPublished || false, // Published = historically immutable
            publishedAt: data.publishedAt || null,
            isStale: false, // Flagged when schedule changes post-publish
            staleReason: '',
            date: data.date || '',
            generalCall: data.generalCall || '07:00 AM',
            breakfast: data.breakfast || '06:30 AM',
            estimatedWrap: data.estimatedWrap || '07:00 PM',
            weather: data.weather || 'Clear • 68°F / 20°C',
            hospital: data.hospital || 'General Memorial Hospital, 100 Main St',
            nearestFire: data.nearestFire || 'Station 4',
            generalNotes: data.generalNotes || 'Closed set. All cast and crew report to production staging.',
            locationAddress: data.locationAddress || '',
            parkingNotes: data.parkingNotes || 'Crew parking in Lot B on 4th Ave.',
            sceneIds: data.sceneIds || [], // Array of stable scene IDs planned
            castCalls: data.castCalls || [], // Array of { characterId, characterName, actorName, callTime, onSetTime, notes }
            crewCalls: data.crewCalls || [], // Array of { department, position, name, callTime, notes }
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.callSheets, sheet);
        return sheet;
    },
    async get(id) { return _get(STORES.callSheets, id); },
    async getByProject(projectId) {
        const list = await _getAllByIndex(STORES.callSheets, 'projectId', projectId);
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async getByShootDay(shootDayId) {
        const list = await _getAllByIndex(STORES.callSheets, 'shootDayId', shootDayId);
        if (!list.length) return null;
        // Prefer the latest draft; fall back to the latest published revision
        const drafts = list.filter(s => !s.isPublished).sort((a, b) => b.updatedAt - a.updatedAt);
        if (drafts.length) return drafts[0];
        return list.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
    },
    async update(id, changes) {
        const existing = await _get(STORES.callSheets, id);
        if (!existing) throw new Error(`CallSheet ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.callSheets, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.callSheets, id); }
};

// ─── MOODBOARDS & VISUAL REFERENCES ───────────────────────────────────────────

export const moodboards = {
    async create(data) {
        const now = Date.now();
        const item = {
            id: generateId('mdb'),
            projectId: data.projectId,
            title: data.title || 'Visual Reference',
            category: data.category || 'lighting', // lighting | costume | location | character | production_design | palette
            imageUrl: data.imageUrl || '',
            colors: data.colors || ['#713BFF', '#FF38B8', '#00E5FF'],
            notes: data.notes || '',
            linkedEntityType: data.linkedEntityType || null, // 'scene' | 'character' | 'location'
            linkedEntityId: data.linkedEntityId || null,     // Stable target ID
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.moodboardItems, item);
        return item;
    },
    async get(id) { return _get(STORES.moodboardItems, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.moodboardItems, 'projectId', projectId);
    },
    async getByLinkedEntity(entityId) {
        return _getAllByIndex(STORES.moodboardItems, 'linkedEntityId', entityId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.moodboardItems, id);
        if (!existing) throw new Error(`MoodboardItem ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.moodboardItems, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.moodboardItems, id); }
};

// ─── PRODUCTION TASKS ─────────────────────────────────────────────────────────

export const tasks = {
    async create(data) {
        const now = Date.now();
        const task = {
            id: generateId('tsk'),
            projectId: data.projectId,
            title: data.title || 'Untitled Task',
            assignedTo: data.assignedTo || '',
            department: data.department || 'Production',
            status: data.status || 'todo', // todo | in_progress | review | done
            priority: data.priority || 'medium', // low | medium | high | urgent
            dueDate: data.dueDate || '',
            relatedEntityType: data.relatedEntityType || null, // 'scene' | 'character' | 'shootDay'
            relatedEntityId: data.relatedEntityId || null,
            notes: data.notes || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.tasks, task);
        return task;
    },
    async get(id) { return _get(STORES.tasks, id); },
    async getByProject(projectId) {
        const list = await _getAllByIndex(STORES.tasks, 'projectId', projectId);
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async update(id, changes) {
        const existing = await _get(STORES.tasks, id);
        if (!existing) throw new Error(`Task ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.tasks, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.tasks, id); }
};

// ─── ACTIVITY LOGS (Change History) ───────────────────────────────────────────

export const activityLogs = {
    async log(projectId, entityType, entityId, action, description, previousValue = null, newValue = null) {
        const logEntry = {
            id: generateId('log'),
            projectId,
            entityType,
            entityId,
            action, // 'created' | 'updated' | 'renamed' | 'deleted' | 'published'
            description,
            previousValue,
            newValue,
            timestamp: Date.now()
        };
        await _put(STORES.activityLogs, logEntry);
        return logEntry;
    },
    async getByProject(projectId, limit = 50) {
        const all = await _getAllByIndex(STORES.activityLogs, 'projectId', projectId);
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
};

// ─── SEASONS & EPISODES ───────────────────────────────────────────────────────

export const seasons = {
    async create(data) {
        const now = Date.now();
        const season = {
            id: generateId('sea'),
            projectId: data.projectId,
            name: data.name || 'Season 1',
            order: data.order || 1,
            description: data.description || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.seasons, season);
        return season;
    },
    async get(id) { return _get(STORES.seasons, id); },
    async getByProject(projectId) {
        const all = await _getAllByIndex(STORES.seasons, 'projectId', projectId);
        return all.sort((a, b) => a.order - b.order);
    },
    async update(id, changes) {
        const existing = await _get(STORES.seasons, id);
        if (!existing) throw new Error(`Season ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.seasons, updated);
        return updated;
    },
    async delete(id) {
        const existing = await _get(STORES.seasons, id);
        const epList = existing ? await episodes.getByProject(existing.projectId) : [];
        for (const ep of epList) {
            if (ep.seasonId === id) await episodes.delete(ep.id);
        }
        return _delete(STORES.seasons, id);
    }
};

export const episodes = {
    async create(data) {
        const now = Date.now();
        const ep = {
            id: generateId('epi'),
            projectId: data.projectId,
            seasonId: data.seasonId,
            order: data.order || 1,
            title: data.title || `Episode ${data.order || 1}`,
            logline: data.logline || '',
            status: data.status || 'draft',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.episodes, ep);
        return ep;
    },
    async get(id) { return _get(STORES.episodes, id); },
    async getByProject(projectId) {
        const all = await _getAllByIndex(STORES.episodes, 'projectId', projectId);
        return all.sort((a, b) => a.order - b.order);
    },
    async update(id, changes) {
        const existing = await _get(STORES.episodes, id);
        if (!existing) throw new Error(`Episode ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.episodes, updated);
        return updated;
    },
    async delete(id) {
        const existing = await _get(STORES.episodes, id);
        const spList = existing ? await screenplays.getByProject(existing.projectId) : [];
        for (const sp of spList) {
            if (sp.episodeId === id) await screenplays.delete(sp.id);
        }
        return _delete(STORES.episodes, id);
    }
};

// ─── DOCUMENTS & VERSIONS ─────────────────────────────────────────────────────

export const documents = {
    async create(data) {
        const now = Date.now();
        const doc = {
            id: generateId('doc'),
            projectId: data.projectId,
            type: data.type || 'note',
            title: data.title || 'Untitled',
            content: data.content || '',
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.documents, doc);
        return doc;
    },
    async get(id) { return _get(STORES.documents, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.documents, 'projectId', projectId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.documents, id);
        if (!existing) throw new Error(`Document ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.documents, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.documents, id); }
};

export const versions = {
    async create(data) {
        const record = {
            id: generateId('ver'),
            screenplayId: data.screenplayId,
            timestamp: Date.now(),
            title: data.title || 'Auto-saved revision',
            wordCount: data.wordCount || 0,
            sceneCount: data.sceneCount || 0,
            content: data.content || ''
        };
        await _put(STORES.versions, record);
        return record;
    },
    async getByScreenplay(screenplayId, limit = 40) {
        const all = await _getAllByIndex(STORES.versions, 'screenplayId', screenplayId);
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },
    async get(id) { return _get(STORES.versions, id); },
    async delete(id) { return _delete(STORES.versions, id); }
};

// ─── SCRIPT INTELLIGENCE, TAGS & EVENTS ───────────────────────────────────────

export const analysisCandidates = {
    async create(data) {
        const now = Date.now();
        const candidate = {
            id: generateId('cand'),
            projectId: data.projectId,
            screenplayId: data.screenplayId,
            entityType: data.entityType, // 'character', 'location', 'event', 'prop', 'costume', 'vfx', 'stunt', 'sound'
            name: (data.name || '').trim(),
            normalizedName: (data.normalizedName || data.name || '').trim().toUpperCase(),
            confidence: data.confidence !== undefined ? data.confidence : 0.85,
            status: data.status || 'pending', // 'pending', 'accepted', 'rejected', 'merged'
            sceneNumber: data.sceneNumber || 1,
            sceneHeading: data.sceneHeading || '',
            contextSnippet: data.contextSnippet || '',
            occurrences: data.occurrences || 1,
            metadata: data.metadata || {},
            mergedIntoId: data.mergedIntoId || null,
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.analysisCandidates, candidate);
        return candidate;
    },
    async get(id) { return _get(STORES.analysisCandidates, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.analysisCandidates, 'projectId', projectId);
    },
    async getByScreenplay(screenplayId) {
        return _getAllByIndex(STORES.analysisCandidates, 'screenplayId', screenplayId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.analysisCandidates, id);
        if (!existing) throw new Error(`Candidate ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.analysisCandidates, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.analysisCandidates, id); },
    async clearForScreenplay(screenplayId) {
        const all = await this.getByScreenplay(screenplayId);
        for (const item of all) {
            await _delete(STORES.analysisCandidates, item.id);
        }
    }
};

export const scriptTags = {
    async create(data) {
        const now = Date.now();
        const tag = {
            id: generateId('tag'),
            projectId: data.projectId,
            screenplayId: data.screenplayId,
            tagType: data.tagType || 'character', // 'character', 'location', 'prop', 'costume', 'vfx', 'sound', 'custom'
            label: (data.label || '').trim(),
            entityId: data.entityId || null,
            sceneId: data.sceneId || null,
            color: data.color || '#713BFF',
            createdAt: now
        };
        await _put(STORES.scriptTags, tag);
        return tag;
    },
    async get(id) { return _get(STORES.scriptTags, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.scriptTags, 'projectId', projectId);
    },
    async getByScreenplay(screenplayId) {
        return _getAllByIndex(STORES.scriptTags, 'screenplayId', screenplayId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.scriptTags, id);
        if (!existing) throw new Error(`Tag ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.scriptTags, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.scriptTags, id); }
};

export const events = {
    async create(data) {
        const now = Date.now();
        const evt = {
            id: generateId('evt'),
            projectId: data.projectId,
            screenplayId: data.screenplayId,
            sceneId: data.sceneId || null,
            title: (data.title || '').trim(),
            description: data.description || '',
            category: data.category || 'plot-point', // 'plot-point', 'revelation', 'conflict', 'entrance-exit', 'turning-point'
            status: data.status || 'suggested', // 'suggested', 'confirmed'
            order: data.order || 1,
            characterIds: data.characterIds || [],
            createdAt: now,
            updatedAt: now
        };
        await _put(STORES.events, evt);
        return evt;
    },
    async get(id) { return _get(STORES.events, id); },
    async getByProject(projectId) {
        return _getAllByIndex(STORES.events, 'projectId', projectId);
    },
    async getByScreenplay(screenplayId) {
        return _getAllByIndex(STORES.events, 'screenplayId', screenplayId);
    },
    async getByScene(sceneId) {
        return _getAllByIndex(STORES.events, 'sceneId', sceneId);
    },
    async update(id, changes) {
        const existing = await _get(STORES.events, id);
        if (!existing) throw new Error(`Event ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: Date.now() };
        await _put(STORES.events, updated);
        return updated;
    },
    async delete(id) { return _delete(STORES.events, id); }
};

export const settings = {
    async get(key, defaultValue = null) {
        const record = await _get(STORES.settings, key);
        return record ? record.value : defaultValue;
    },
    async set(key, value) {
        await _put(STORES.settings, { key, value });
    }
};

// Legacy Migration helper
export async function migrateFromLegacy() {
    try {
        const databases = await indexedDB.databases();
        const oldDb = databases.find(d => d.name === 'CinecoreScreenplayDB');
        if (!oldDb) return null;

        const oldDbInstance = await new Promise((resolve, reject) => {
            const req = indexedDB.open('CinecoreScreenplayDB', 1);
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });

        const oldDoc = await new Promise((resolve) => {
            try {
                const tx = oldDbInstance.transaction('documents', 'readonly');
                const store = tx.objectStore('documents');
                const req = store.get('current_script');
                req.onsuccess = (e) => resolve(e.target.result || null);
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });

        oldDbInstance.close();
        if (oldDoc && oldDoc.content) return oldDoc;
        return null;
    } catch {
        return null;
    }
}
