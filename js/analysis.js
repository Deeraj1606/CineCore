/**
 * analysis.js — Screenplay Analysis & Structured Information Extraction Pipeline for CINECORE
 * "SCRIPT -> PARSE -> EXTRACT CANDIDATES -> REVIEW -> SAVE ENTITIES -> LINK RECORDS -> UPDATE DEPENDENCIES"
 * 
 * Deterministic rule-based extraction engine for scenes, characters (speaking vs mentions),
 * locations (story vs filming), events/beats, props, costumes, vehicles, stunts, and sound.
 */

import {
    scenes,
    characters,
    locations,
    breakdownItems,
    events,
    analysisCandidates,
    activityLogs,
    generateId
} from './store.js';

// Common production element keywords for deterministic extraction
const PROP_PATTERNS = [
    /\b(GUN|PISTOL|RIFLE|BLASTER|REVOLVER|KNIFE|BLADE|DAGGER|SWORD)\b/gi,
    /\b(CHRONOMETER|WATCH|PHONE|SMARTPHONE|RADIO|COMM|COMMS|DEVICE|PDA|TABLET|GAUNTLET)\b/gi,
    /\b(KEY|KEYCARD|BADGE|PASSPORT|ID CARD|DOCUMENT|ENVELOPE|FILE|DOSSIER|NOTEBOOK|JOURNAL)\b/gi,
    /\b(BRIEFCASE|BAG|BACKPACK|SUITCASE|CRATE|BOX|PACKAGE)\b/gi,
    /\b(GLASS|BOTTLE|CIGARETTE|LIGHTER|FLASK|COFFEE CUP|MUG)\b/gi
];

const COSTUME_PATTERNS = [
    /\b(TRENCH COAT|JACKET|COAT|SUIT|TUXEDO|UNIFORM|ARMOR|VEST)\b/gi,
    /\b(VISOR|HELMET|MASK|SUNGLASSES|GOGGLES|HOOD)\b/gi,
    /\b(DRESS|GOWN|BOOTS|GLOVES|CAPE|ROBE)\b/gi
];

const VEHICLE_PATTERNS = [
    /\b(CAR|SEDAN|TRUCK|VAN|MOTORCYCLE|BIKE|SPINNER|CRUISER|HELICOPTER|AIRCRAFT|SHIP|BOAT)\b/gi
];

const VFX_STUNT_PATTERNS = [
    /\b(EXPLOSION|EXPLODES|BLAST|DETONATES|FIRE|FLAMES|HOLOGRAM|LASER|SHATTERS)\b/gi,
    /\b(LEAPS|DIVES|CRASHES|FALLS|JUMPS FROM|TACKLES|HANGS FROM LEDGE)\b/gi
];

const SOUND_PATTERNS = [
    /\b(SIREN|ALARM|GUNSHOT|GUNFIRE|THUNDER|EXPLOSION|METALLIC CLANG|SCREAM|STATIC|BEEPING)\b/gi
];

const EVENT_ACTION_PATTERNS = [
    { pattern: /\b(ENTERS|ARRIVES|STEPS INTO|BURSTS IN)\b/i, category: 'entrance-exit' },
    { pattern: /\b(EXITS|LEAVES|RUNS OUT|DISAPPEARS|VANISHES)\b/i, category: 'entrance-exit' },
    { pattern: /\b(SHOOTS|KILLS|ATTACKS|FIGHTS|SLAMS|DRAWS WEAPON|STRUGGLES)\b/i, category: 'conflict' },
    { pattern: /\b(REVEALS|DISCOVERS|UNCOVERS|FINDS|REALIZES|CONFESSES)\b/i, category: 'revelation' },
    { pattern: /\b(KISSES|EMBRACES|BETRAYS|ABANDONS|ARRESTS)\b/i, category: 'turning-point' },
    { pattern: /\b(DECIDES|CHOOSES|VOWS|TURNS BACK|LEAPS INTO)\b/i, category: 'plot-point' }
];

/**
 * Normalizes character name by stripping parentheticals and punctuation
 */
export function cleanCharacterName(rawName) {
    if (!rawName) return '';
    return rawName
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/['"]/g, '')
        .replace(/^(MR\.|MS\.|MRS\.|DR\.|DETECTIVE|OFFICER|CAPTAIN|AGENT)\s+/i, '')
        .trim()
        .toUpperCase();
}

/**
 * Parses screenplay text into semantic script blocks
 */
export function parseScriptBlocks(screenplayText) {
    if (!screenplayText) return [];
    const lines = screenplayText.split(/\r?\n/);
    const blocks = [];
    let prevType = 'action';

    for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const upper = line.toUpperCase();
        let type = 'action';

        if (upper.startsWith('INT.') || upper.startsWith('EXT.') || upper.startsWith('INT/EXT.') || upper.startsWith('I/E.') || upper.startsWith('EST.')) {
            type = 'scene-heading';
        } else if (upper.endsWith('TO:') || upper === 'FADE OUT.' || upper === 'FADE IN:' || upper === 'CUT TO BLACK.') {
            type = 'transition';
        } else if (line.startsWith('(') && line.endsWith(')')) {
            type = 'parenthetical';
        } else if (/^[A-Z0-9\s\.\(\)\_'\-]{2,35}$/.test(line) && prevType !== 'character' && !upper.startsWith('EXT.') && !upper.startsWith('INT.')) {
            type = 'character';
        } else if (prevType === 'character' || prevType === 'parenthetical') {
            type = 'dialogue';
        }

        blocks.push({ type, text: line, upper });
        prevType = type;
    }

    return blocks;
}

/**
 * Executes the complete extraction pipeline on screenplay text
 */
export async function runScriptAnalysisPipeline(projectId, screenplayId, screenplayText) {
    const blocks = parseScriptBlocks(screenplayText);
    const candidates = [];

    let currentSceneNum = 0;
    let currentSceneHeading = 'PROLOGUE';
    let currentSceneText = [];
    let currentSceneCharacters = new Set();

    const speakingCharacters = new Map(); // name -> { count, words, dialogueLines, scenes: Set }
    const actionMentions = new Map();    // name -> { count, scenes: Set }
    const extractedLocations = new Map(); // name -> { count, times: Set, scenes: Set, setting }
    const extractedEvents = [];
    const extractedProductionItems = []; // category, name, sceneNum, sceneHeading

    // Existing project entities for deduplication & matching
    const existingChars = await characters.getByProject(projectId);
    const existingLocs = await locations.getByProject(projectId);

    const existingCharNames = new Map(existingChars.map(c => [cleanCharacterName(c.name), c]));
    const existingLocNames = new Map(existingLocs.map(l => [l.name.toUpperCase().trim(), l]));

    let lastSpeakingCharacter = null;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        if (block.type === 'scene-heading') {
            currentSceneNum++;
            currentSceneHeading = block.text;
            currentSceneCharacters = new Set();
            lastSpeakingCharacter = null;

            // Extract Scene Candidate
            let intOrExt = 'INT';
            if (block.upper.startsWith('EXT.')) intOrExt = 'EXT';
            else if (block.upper.startsWith('INT/EXT.') || block.upper.startsWith('I/E.')) intOrExt = 'INT/EXT';

            let timeOfDay = 'DAY';
            const timeMatch = block.text.match(/\s+-\s+([A-Z0-9\s]+)$/i);
            if (timeMatch) timeOfDay = timeMatch[1].trim().toUpperCase();

            let setting = block.text
                .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*/i, '')
                .replace(/\s+-\s+.*$/, '')
                .trim();

            candidates.push({
                projectId,
                screenplayId,
                entityType: 'scene',
                name: block.text,
                normalizedName: block.upper,
                confidence: 0.99,
                status: 'pending',
                sceneNumber: currentSceneNum,
                sceneHeading: block.text,
                contextSnippet: block.text,
                metadata: {
                    sceneNumber: currentSceneNum,
                    intOrExt,
                    timeOfDay,
                    setting: setting.toUpperCase()
                }
            });

            // Extract Location Candidate
            if (setting) {
                const locKey = setting.toUpperCase();
                if (!extractedLocations.has(locKey)) {
                    extractedLocations.set(locKey, {
                        count: 0,
                        times: new Set(),
                        scenes: new Set(),
                        setting: locKey,
                        intOrExt
                    });
                }
                const locObj = extractedLocations.get(locKey);
                locObj.count++;
                locObj.times.add(timeOfDay);
                locObj.scenes.add(currentSceneNum);
            }
        } else if (block.type === 'character') {
            const rawName = block.text;
            const cleaned = cleanCharacterName(rawName);

            if (cleaned && cleaned.length > 1) {
                if (!speakingCharacters.has(cleaned)) {
                    speakingCharacters.set(cleaned, {
                        rawName,
                        cleaned,
                        count: 0,
                        words: 0,
                        dialogueLines: 0,
                        scenes: new Set()
                    });
                }
                const charData = speakingCharacters.get(cleaned);
                charData.count++;
                charData.scenes.add(currentSceneNum);
                lastSpeakingCharacter = cleaned;
            }
        } else if (block.type === 'dialogue') {
            if (lastSpeakingCharacter && speakingCharacters.has(lastSpeakingCharacter)) {
                const charData = speakingCharacters.get(lastSpeakingCharacter);
                charData.dialogueLines++;
                charData.words += block.text.split(/\s+/).filter(Boolean).length;
            }
        } else if (block.type === 'action') {
            // Check for narrative events / story beats
            for (const ep of EVENT_ACTION_PATTERNS) {
                if (ep.pattern.test(block.text)) {
                    extractedEvents.push({
                        title: block.text.slice(0, 70) + (block.text.length > 70 ? '...' : ''),
                        description: block.text,
                        category: ep.category,
                        sceneNumber: currentSceneNum,
                        sceneHeading: currentSceneHeading
                    });
                    break;
                }
            }

            // Check for Props
            for (const pat of PROP_PATTERNS) {
                const matches = block.upper.match(pat);
                if (matches) {
                    matches.forEach(m => {
                        extractedProductionItems.push({
                            category: 'Props',
                            name: m.toUpperCase().trim(),
                            sceneNumber: currentSceneNum,
                            sceneHeading: currentSceneHeading,
                            contextSnippet: block.text
                        });
                    });
                }
            }

            // Check for Costumes
            for (const pat of COSTUME_PATTERNS) {
                const matches = block.upper.match(pat);
                if (matches) {
                    matches.forEach(m => {
                        extractedProductionItems.push({
                            category: 'Costumes',
                            name: m.toUpperCase().trim(),
                            sceneNumber: currentSceneNum,
                            sceneHeading: currentSceneHeading,
                            contextSnippet: block.text
                        });
                    });
                }
            }

            // Check for Vehicles
            for (const pat of VEHICLE_PATTERNS) {
                const matches = block.upper.match(pat);
                if (matches) {
                    matches.forEach(m => {
                        extractedProductionItems.push({
                            category: 'Vehicles',
                            name: m.toUpperCase().trim(),
                            sceneNumber: currentSceneNum,
                            sceneHeading: currentSceneHeading,
                            contextSnippet: block.text
                        });
                    });
                }
            }

            // Check for VFX & Stunts
            for (const pat of VFX_STUNT_PATTERNS) {
                const matches = block.upper.match(pat);
                if (matches) {
                    matches.forEach(m => {
                        extractedProductionItems.push({
                            category: 'VFX / Stunts',
                            name: m.toUpperCase().trim(),
                            sceneNumber: currentSceneNum,
                            sceneHeading: currentSceneHeading,
                            contextSnippet: block.text
                        });
                    });
                }
            }

            // Check for Sound Cues
            for (const pat of SOUND_PATTERNS) {
                const matches = block.upper.match(pat);
                if (matches) {
                    matches.forEach(m => {
                        extractedProductionItems.push({
                            category: 'Sound FX',
                            name: m.toUpperCase().trim(),
                            sceneNumber: currentSceneNum,
                            sceneHeading: currentSceneHeading,
                            contextSnippet: block.text
                        });
                    });
                }
            }
        }
    }

    // Convert speaking characters to Candidate records
    for (const [name, data] of speakingCharacters.entries()) {
        const matchingExisting = existingCharNames.get(name);
        // Find potential duplicate candidates
        let possibleDuplicateOf = null;
        for (const otherName of speakingCharacters.keys()) {
            if (otherName !== name && (otherName.includes(name) || name.includes(otherName))) {
                possibleDuplicateOf = otherName;
                break;
            }
        }

        candidates.push({
            projectId,
            screenplayId,
            entityType: 'character',
            name: data.cleaned,
            normalizedName: data.cleaned,
            confidence: 0.98,
            status: 'pending',
            occurrences: data.count,
            contextSnippet: `Speaking character in ${data.scenes.size} scene(s) with ${data.dialogueLines} line(s) and ${data.words} word(s).`,
            metadata: {
                isSpeaking: true,
                dialogueLines: data.dialogueLines,
                wordCount: data.words,
                scenes: Array.from(data.scenes),
                existingMatchId: matchingExisting ? matchingExisting.id : null,
                possibleDuplicateOf
            }
        });
    }

    // Convert extracted locations to Candidate records
    for (const [name, loc] of extractedLocations.entries()) {
        const matchingExisting = existingLocNames.get(name);
        candidates.push({
            projectId,
            screenplayId,
            entityType: 'location',
            name: loc.setting,
            normalizedName: name,
            confidence: 0.95,
            status: 'pending',
            occurrences: loc.count,
            contextSnippet: `${loc.intOrExt} setting appearing in ${loc.scenes.size} scene(s). Times: ${Array.from(loc.times).join(', ')}`,
            metadata: {
                intOrExt: loc.intOrExt,
                times: Array.from(loc.times),
                scenes: Array.from(loc.scenes),
                existingMatchId: matchingExisting ? matchingExisting.id : null
            }
        });
    }

    // Convert extracted events to Candidate records
    for (const evt of extractedEvents) {
        candidates.push({
            projectId,
            screenplayId,
            entityType: 'event',
            name: evt.title,
            normalizedName: evt.title.toUpperCase(),
            confidence: 0.85,
            status: 'pending',
            sceneNumber: evt.sceneNumber,
            sceneHeading: evt.sceneHeading,
            contextSnippet: evt.description,
            metadata: {
                category: evt.category,
                sceneNumber: evt.sceneNumber
            }
        });
    }

    // Convert extracted production elements (Props, Costumes, etc.)
    const uniqueProdItems = new Map();
    for (const item of extractedProductionItems) {
        const key = `${item.category}:${item.name}`;
        if (!uniqueProdItems.has(key)) {
            uniqueProdItems.set(key, { ...item, count: 0, scenes: new Set() });
        }
        const record = uniqueProdItems.get(key);
        record.count++;
        record.scenes.add(item.sceneNumber);
    }

    for (const item of uniqueProdItems.values()) {
        candidates.push({
            projectId,
            screenplayId,
            entityType: item.category.toLowerCase().replace(/[^a-z]/g, ''),
            name: item.name,
            normalizedName: item.name,
            confidence: 0.88,
            status: 'pending',
            occurrences: item.count,
            sceneNumber: item.sceneNumber,
            sceneHeading: item.sceneHeading,
            contextSnippet: item.contextSnippet,
            metadata: {
                category: item.category,
                scenes: Array.from(item.scenes)
            }
        });
    }

    // Save candidates to IndexedDB
    await analysisCandidates.clearForScreenplay(screenplayId);
    for (const cand of candidates) {
        await analysisCandidates.create(cand);
    }

    return candidates;
}

/**
 * Commits accepted and verified candidates into the canonical project stores
 */
export async function commitVerifiedCandidates(projectId, screenplayId) {
    const allCandidates = await analysisCandidates.getByScreenplay(screenplayId);
    const accepted = allCandidates.filter(c => c.status === 'accepted' || c.status === 'pending');

    const createdStats = {
        scenes: 0,
        characters: 0,
        locations: 0,
        events: 0,
        breakdownItems: 0
    };

    // 1. Process Locations
    const locCandidates = accepted.filter(c => c.entityType === 'location');
    const existingLocs = await locations.getByProject(projectId);
    const locMap = new Map(existingLocs.map(l => [l.name.toUpperCase().trim(), l]));

    for (const lc of locCandidates) {
        const key = lc.normalizedName;
        if (!locMap.has(key)) {
            const newLoc = await locations.create({
                projectId,
                name: lc.name,
                type: lc.metadata?.intOrExt === 'EXT' ? 'Exterior' : 'Interior',
                atmosphere: `Appears in ${lc.occurrences} scene(s).`
            });
            locMap.set(key, newLoc);
            createdStats.locations++;
        }
    }

    // 2. Process Characters
    const charCandidates = accepted.filter(c => c.entityType === 'character');
    const existingChars = await characters.getByProject(projectId);
    const charMap = new Map(existingChars.map(c => [cleanCharacterName(c.name), c]));

    for (const cc of charCandidates) {
        const key = cc.normalizedName;
        if (!charMap.has(key)) {
            const newChar = await characters.create({
                projectId,
                name: cc.name,
                role: 'Cast',
                bio: `Identified from screenplay. ${cc.metadata?.dialogueLines || 0} dialogue line(s).`
            });
            charMap.set(key, newChar);
            createdStats.characters++;
        }
    }

    // 3. Process Scenes (reconciling with stable IDs)
    const sceneCandidates = accepted.filter(c => c.entityType === 'scene');
    const existingScenes = await scenes.getByScreenplay(screenplayId);
    const sceneMap = new Map(existingScenes.map(s => [s.heading.toUpperCase().trim(), s]));

    for (const sc of sceneCandidates) {
        const key = sc.normalizedName.trim();
        const loc = locMap.get(sc.metadata?.setting?.toUpperCase());
        const locId = loc ? loc.id : null;

        if (sceneMap.has(key)) {
            const existing = sceneMap.get(key);
            await scenes.update(existing.id, {
                sceneNumber: sc.metadata?.sceneNumber || existing.sceneNumber,
                locationId: locId || existing.locationId,
                intOrExt: sc.metadata?.intOrExt || existing.intOrExt,
                timeOfDay: sc.metadata?.timeOfDay || existing.timeOfDay
            });
        } else {
            const newScene = await scenes.create({
                projectId,
                screenplayId,
                sceneNumber: sc.metadata?.sceneNumber || 1,
                heading: sc.name,
                locationId: locId,
                intOrExt: sc.metadata?.intOrExt || 'INT',
                timeOfDay: sc.metadata?.timeOfDay || 'DAY'
            });
            sceneMap.set(key, newScene);
            createdStats.scenes++;
        }
    }

    // 4. Process Events / Story Beats
    const eventCandidates = accepted.filter(c => c.entityType === 'event');
    for (const ec of eventCandidates) {
        const targetScene = sceneMap.get(ec.sceneHeading?.toUpperCase()?.trim());
        await events.create({
            projectId,
            screenplayId,
            sceneId: targetScene ? targetScene.id : null,
            title: ec.name,
            description: ec.contextSnippet,
            category: ec.metadata?.category || 'plot-point',
            status: 'confirmed',
            order: ec.sceneNumber || 1
        });
        createdStats.events++;
    }

    // 5. Process Breakdown Items (Props, Costumes, Stunts, etc.)
    const breakdownCandidates = accepted.filter(c => ['props', 'costumes', 'vehicles', 'vfxstunts', 'soundfx'].includes(c.entityType));
    const allScenesList = await scenes.getByScreenplay(screenplayId);
    const sceneByNum = new Map(allScenesList.map(s => [s.sceneNumber, s]));

    for (const bc of breakdownCandidates) {
        const targetScene = sceneByNum.get(bc.sceneNumber) || allScenesList[0];
        if (targetScene) {
            await breakdownItems.create({
                projectId,
                sceneId: targetScene.id,
                category: bc.metadata?.category || 'Props',
                name: bc.name,
                notes: bc.contextSnippet || 'Extracted candidate'
            });
            createdStats.breakdownItems++;
        }
    }

    // Log Activity
    await activityLogs.log(
        projectId,
        'analysis',
        screenplayId,
        'committed',
        `Committed analysis: ${createdStats.scenes} scenes, ${createdStats.characters} characters, ${createdStats.locations} locations, ${createdStats.events} events, ${createdStats.breakdownItems} breakdown items.`
    );

    return createdStats;
}
