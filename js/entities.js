/**
 * entities.js - Learned Screenplay Entity Memory System
 * Manages persistent in-memory and storage-backed dictionaries for screenplay entities:
 * Characters, Locations, Transitions, Times of Day, and Scene Prefixes.
 * 
 * Each entity stores: { name, usageCount, lastUsed, originalFormatting }
 * Strictly semantic: No generic dictionary words.
 */

const DEFAULT_PREFIXES = ['INT. ', 'EXT. ', 'INT/EXT. ', 'I/E. ', 'EST. '];

const DEFAULT_TIMES = [
    'DAY',
    'NIGHT',
    'CONTINUOUS',
    'LATER',
    'EVENING',
    'MORNING',
    'DAWN',
    'DUSK',
    'MOMENTS LATER',
    'SAME TIME',
    'FLASHBACK'
];

const DEFAULT_TRANSITIONS = [
    'CUT TO:',
    'FADE IN:',
    'FADE OUT.',
    'DISSOLVE TO:',
    'MATCH CUT TO:',
    'JUMP CUT TO:',
    'SMASH CUT TO:',
    'TIME CUT:',
    'BACK TO:',
    'IRIS OUT.'
];

export class EntityDictionary {
    constructor() {
        // Map of entityKey (UPPERCASE) -> { name, usageCount, lastUsed, originalFormatting }
        this.characters = new Map();
        this.locations = new Map();
        this.transitions = new Map();
        this.timeOfDay = new Map();
        this.scenePrefixes = new Map();
        this.props = new Map();

        this.initDefaults();
    }

    initDefaults() {
        DEFAULT_PREFIXES.forEach((p, idx) => {
            const key = p.toUpperCase().trim();
            this.scenePrefixes.set(key, {
                name: p,
                usageCount: 100 - idx,
                lastUsed: Date.now() - (idx * 1000),
                originalFormatting: p
            });
        });

        DEFAULT_TIMES.forEach((t, idx) => {
            const key = t.toUpperCase().trim();
            this.timeOfDay.set(key, {
                name: t,
                usageCount: 50 - idx,
                lastUsed: Date.now() - (idx * 1000),
                originalFormatting: t
            });
        });

        DEFAULT_TRANSITIONS.forEach((t, idx) => {
            const key = t.toUpperCase().trim();
            this.transitions.set(key, {
                name: t,
                usageCount: 50 - idx,
                lastUsed: Date.now() - (idx * 1000),
                originalFormatting: t
            });
        });
    }

    getCollection(type) {
        switch (type) {
            case 'character':
                return this.characters;
            case 'location':
                return this.locations;
            case 'transition':
                return this.transitions;
            case 'timeOfDay':
                return this.timeOfDay;
            case 'prop':
                return this.props;
            case 'scenePrefix':
            case 'scene-heading':
                return this.scenePrefixes;
            default:
                return null;
        }
    }

    /**
     * Learn or update an entity immediately
     */
    learn(type, rawName, isManual = false) {
        if (!rawName) return null;

        let cleanName = rawName.trim();
        if (type === 'character') {
            // Strip voiceover / extensions: e.g. "KAI (V.O.)" -> "KAI"
            cleanName = cleanName.replace(/\(.*\)/g, '').trim().toUpperCase();
        } else if (type === 'location' || type === 'transition' || type === 'timeOfDay' || type === 'prop') {
            cleanName = cleanName.toUpperCase();
        }

        if (cleanName.length < 1) return null;

        const collection = this.getCollection(type);
        if (!collection) return null;

        const key = cleanName.toUpperCase();
        const existing = collection.get(key);

        if (existing) {
            existing.usageCount++;
            existing.lastUsed = Date.now();
            if (isManual) existing.isManual = true;
            return existing;
        }

        const newEntity = {
            name: cleanName,
            usageCount: 1,
            lastUsed: Date.now(),
            originalFormatting: cleanName,
            isManual: isManual
        };

        if (type === 'character') {
            newEntity.fullName = '';
            newEntity.age = '';
            newEntity.role = 'Supporting';
            newEntity.bio = '';
            newEntity.goals = '';
            newEntity.physical = '';
        } else if (type === 'location') {
            newEntity.fullName = '';
            newEntity.type = 'Interior (INT)';
            newEntity.region = '';
            newEntity.visual = '';
            newEntity.atmosphere = '';
            newEntity.notes = '';
        } else if (type === 'prop') {
            newEntity.category = 'props';
            newEntity.status = 'needed';
        }

        collection.set(key, newEntity);
        return newEntity;
    }

    /**
     * Rename an entity consistently across the dictionary
     */
    rename(type, oldName, newName) {
        const collection = this.getCollection(type);
        if (!collection) return;

        const oldKey = oldName.trim().toUpperCase();
        const newKey = newName.trim().toUpperCase();
        const existing = collection.get(oldKey);

        if (existing) {
            collection.delete(oldKey);
            existing.name = newName.trim().toUpperCase();
            existing.lastUsed = Date.now();
            collection.set(newKey, existing);
        }
    }

    /**
     * Instant, zero-lag query with ranking and match highlighting
     * 
     * Ranking rules:
     * 1. Exact prefix match (entity starts with query)
     * 2. Word boundary match (e.g. "STATION" in "POLICE STATION")
     * 3. Highest usage count (frequency)
     * 4. Most recently used (recency)
     * 5. Substring / fuzzy match only when prefix matches are exhausted
     */
    /**
     * Instant, zero-lag query with ranking and match highlighting
     * 
     * Ranking rules:
     * 1. Exact prefix match (entity starts with query)
     * 2. Characters matching from the beginning / word boundary
     * 3. Subsequence / fuzzy match (e.g. "DE" or "DEE" matching "DHEENA")
     * 4. Highest usage count (frequency)
     * 5. Most recently used (recency)
     */
    query(type, rawQuery, maxResults = 6) {
        const collection = this.getCollection(type);
        if (!collection) return [];

        const query = (rawQuery || '').trim().toUpperCase();
        if (query.length === 0) {
            // If empty, return top entities sorted by frequency & recency
            return Array.from(collection.values())
                .sort((a, b) => (b.usageCount * 1000000000000 + b.lastUsed) - (a.usageCount * 1000000000000 + a.lastUsed))
                .slice(0, maxResults)
                .map(e => ({
                    entity: e,
                    label: e.name,
                    matchRanges: []
                }));
        }

        const matches = [];

        for (const entity of collection.values()) {
            const nameUpper = entity.name.toUpperCase();

            // Suppress exact duplicate if user already finished typing the full entity
            if (nameUpper === query) {
                continue;
            }

            // 1. Exact Prefix Match
            if (nameUpper.startsWith(query)) {
                matches.push({
                    entity,
                    label: entity.name,
                    matchRanges: [[0, query.length]],
                    score: 2000 + (entity.usageCount * 10) + (entity.lastUsed / 1e12)
                });
                continue;
            }

            // 2. Word Boundary Match: any word starts with query (e.g. "STA" in "POLICE STATION")
            const wordIdx = nameUpper.indexOf(' ' + query);
            if (wordIdx !== -1) {
                const start = wordIdx + 1;
                matches.push({
                    entity,
                    label: entity.name,
                    matchRanges: [[start, start + query.length]],
                    score: 1500 + (entity.usageCount * 10) + (entity.lastUsed / 1e12)
                });
                continue;
            }

            // For single-character queries, do NOT match internal letters
            if (query.length === 1) {
                continue;
            }

            // 3. Subsequence / Acronym match starting from first letter or word boundary
            // e.g. "DE" or "DEE" matching "DHEENA"
            if (nameUpper[0] === query[0]) {
                let qIdx = 0;
                const ranges = [];
                for (let i = 0; i < nameUpper.length && qIdx < query.length; i++) {
                    if (nameUpper[i] === query[qIdx]) {
                        ranges.push([i, i + 1]);
                        qIdx++;
                    }
                }
                if (qIdx === query.length) {
                    // Merge contiguous ranges
                    const merged = [];
                    for (const r of ranges) {
                        if (merged.length > 0 && merged[merged.length - 1][1] === r[0]) {
                            merged[merged.length - 1][1] = r[1];
                        } else {
                            merged.push([r[0], r[1]]);
                        }
                    }
                    const spanLength = ranges[ranges.length - 1][1] - ranges[0][0];
                    matches.push({
                        entity,
                        label: entity.name,
                        matchRanges: merged,
                        score: 900 - spanLength + (entity.usageCount * 5) + (entity.lastUsed / 1e12)
                    });
                    continue;
                }
            }

            // 4. Substring Match (query length >= 2)
            const subIdx = nameUpper.indexOf(query);
            if (subIdx !== -1) {
                matches.push({
                    entity,
                    label: entity.name,
                    matchRanges: [[subIdx, subIdx + query.length]],
                    score: 400 + (entity.usageCount * 5) + (entity.lastUsed / 1e12)
                });
            }
        }

        // Sort candidates by total score descending
        matches.sort((a, b) => b.score - a.score);
        return matches.slice(0, maxResults);
    }

    /**
     * Serialize learned entities for persistent storage
     */
    serialize() {
        return {
            characters: Array.from(this.characters.values()),
            locations: Array.from(this.locations.values()),
            transitions: Array.from(this.transitions.values()),
            timeOfDay: Array.from(this.timeOfDay.values()),
            props: Array.from(this.props.values())
        };
    }

    /**
     * Delete characters and locations that no longer exist in the script
     */
    syncWithStats(stats) {
        if (!stats) return;

        // Clean Characters
        if (stats.characters) {
            const activeCharNames = new Set(stats.characters.map(c => c.name.toUpperCase()));
            for (const [key, entity] of this.characters.entries()) {
                if (!activeCharNames.has(key) && !entity.isManual) {
                    this.characters.delete(key);
                }
            }
        }

        // Clean Locations
        if (stats.locations) {
            const activeLocNames = new Set(stats.locations.map(l => l.name.toUpperCase()));
            for (const [key, entity] of this.locations.entries()) {
                if (!activeLocNames.has(key) && !entity.isManual) {
                    this.locations.delete(key);
                }
            }
        }
    }

    /**
     * Restore learned entities from storage
     */
    deserialize(data) {
        if (!data) return;

        if (Array.isArray(data.characters)) {
            data.characters.forEach(item => {
                if (item && item.name) {
                    this.characters.set(item.name.toUpperCase(), {
                        name: item.name,
                        usageCount: item.usageCount || 1,
                        lastUsed: item.lastUsed || Date.now(),
                        originalFormatting: item.originalFormatting || item.name,
                        fullName: item.fullName || '',
                        age: item.age || '',
                        role: item.role || 'Supporting',
                        bio: item.bio || '',
                        goals: item.goals || '',
                        physical: item.physical || ''
                    });
                }
            });
        }

        if (Array.isArray(data.locations)) {
            data.locations.forEach(item => {
                if (item && item.name) {
                    this.locations.set(item.name.toUpperCase(), {
                        name: item.name,
                        usageCount: item.usageCount || 1,
                        lastUsed: item.lastUsed || Date.now(),
                        originalFormatting: item.originalFormatting || item.name,
                        isManual: item.isManual || false,
                        fullName: item.fullName || '',
                        type: item.type || 'Interior (INT)',
                        region: item.region || '',
                        visual: item.visual || '',
                        atmosphere: item.atmosphere || '',
                        notes: item.notes || ''
                    });
                }
            });
        }

        if (Array.isArray(data.transitions)) {
            data.transitions.forEach(item => {
                if (item && item.name) {
                    this.transitions.set(item.name.toUpperCase(), {
                        name: item.name,
                        usageCount: item.usageCount || 1,
                        lastUsed: item.lastUsed || Date.now(),
                        originalFormatting: item.originalFormatting || item.name
                    });
                }
            });
        }

        if (Array.isArray(data.timeOfDay)) {
            data.timeOfDay.forEach(item => {
                if (item && item.name) {
                    this.timeOfDay.set(item.name.toUpperCase(), {
                        name: item.name,
                        usageCount: item.usageCount || 1,
                        lastUsed: item.lastUsed || Date.now(),
                        originalFormatting: item.originalFormatting || item.name
                    });
                }
            });
        }

        if (Array.isArray(data.props)) {
            data.props.forEach(item => {
                if (item && item.name) {
                    this.props.set(item.name.toUpperCase(), {
                        name: item.name,
                        usageCount: item.usageCount || 1,
                        lastUsed: item.lastUsed || Date.now(),
                        originalFormatting: item.originalFormatting || item.name,
                        category: item.category || 'props',
                        status: item.status || 'needed',
                        isManual: item.isManual || false
                    });
                }
            });
        }
    }

}
