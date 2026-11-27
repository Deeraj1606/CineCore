/**
 * links.js — Dynamic Linking & Relational Traversal Engine for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 * 
 * Manages bidirectional relationship traversal, stable ID persistence,
 * safe change propagation, and stale relationship detection.
 */

import {
    scenes,
    characters,
    locations,
    breakdownItems,
    storyboards,
    shots,
    shootDays,
    schedules,
    callSheets,
    moodboards,
    tasks,
    activityLogs,
    generateId
} from './store.js';

/**
 * Parses screenplay text into scenes and synchronizes with the persistent store.
 * CRITICAL RULE: Preserves stable scene IDs for existing scenes so linked
 * storyboards, shots, breakdown items, and schedule entries never disconnect!
 */
export async function syncScreenplayScenes(projectId, screenplayId, screenplayText) {
    if (!screenplayText) return [];

    const existingScenes = await scenes.getByScreenplay(screenplayId);
    const existingByHeading = new Map();
    existingScenes.forEach(s => {
        const key = s.heading.toUpperCase().trim();
        if (!existingByHeading.has(key)) existingByHeading.set(key, s);
    });

    const projectCharacters = await characters.getByProject(projectId);
    const charMap = new Map();
    projectCharacters.forEach(c => charMap.set(c.name.toUpperCase().trim(), c.id));

    const projectLocations = await locations.getByProject(projectId);
    const locMap = new Map();
    projectLocations.forEach(l => locMap.set(l.name.toUpperCase().trim(), l.id));

    const lines = screenplayText.split('\n');
    const parsedSceneBlocks = [];
    let currentBlock = null;
    let sceneNum = 1;

    for (let rawLine of lines) {
        const line = rawLine.trim();
        const upper = line.toUpperCase();

        if (upper.startsWith('INT.') || upper.startsWith('EXT.') || upper.startsWith('INT/EXT.') || upper.startsWith('I/E.')) {
            if (currentBlock) parsedSceneBlocks.push(currentBlock);

            let timeOfDay = 'DAY';
            if (upper.includes('NIGHT')) timeOfDay = 'NIGHT';
            else if (upper.includes('DAWN')) timeOfDay = 'DAWN';
            else if (upper.includes('DUSK')) timeOfDay = 'DUSK';
            else if (upper.includes('CONTINUOUS')) timeOfDay = 'CONTINUOUS';
            else if (upper.includes('LATER')) timeOfDay = 'LATER';

            const cleanHeading = line.replace(/^[0-9]+\s*/, '').trim();
            let intExt = 'INT.';
            if (upper.startsWith('EXT.')) intExt = 'EXT.';
            else if (upper.startsWith('INT/EXT.') || upper.startsWith('I/E.')) intExt = 'INT/EXT.';

            // Extract location query
            let placeName = cleanHeading
                .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '')
                .split(' - ')[0]
                .trim()
                .toUpperCase();

            currentBlock = {
                sceneNumber: sceneNum++,
                heading: cleanHeading,
                intExt,
                timeOfDay,
                placeName,
                charactersFound: new Set(),
                linesCount: 1,
                excerpt: [line]
            };
        } else if (currentBlock) {
            currentBlock.linesCount++;
            if (currentBlock.excerpt.length < 5 && line) {
                currentBlock.excerpt.push(line);
            }

            // Check if line is character cue (uppercase dialogue heading)
            if (/^[A-Z0-9\s\(\)\.\_]{2,30}$/.test(line) && !line.includes('EXT.') && !line.includes('INT.')) {
                const cue = line.replace(/\(.*\)/, '').trim().toUpperCase();
                if (cue && cue !== 'TRANSITION' && cue !== 'CUT TO:' && cue !== 'FADE OUT.') {
                    currentBlock.charactersFound.add(cue);
                }
            }
        }
    }

    if (currentBlock) parsedSceneBlocks.push(currentBlock);

    // Synchronize into IndexedDB with stable IDs
    const synchronizedScenes = [];

    for (let idx = 0; idx < parsedSceneBlocks.length; idx++) {
        const parsed = parsedSceneBlocks[idx];
        const headingKey = parsed.heading.toUpperCase().trim();

        // 1. Resolve Location ID if matching place found in locations database
        let locationId = locMap.get(parsed.placeName) || null;

        // 2. Resolve Character IDs for all speaking cues
        const characterIds = [];
        for (const cue of parsed.charactersFound) {
            let cid = charMap.get(cue);
            if (!cid) {
                // Auto-create character in project if not yet recorded
                const newChar = await characters.create({
                    projectId,
                    name: cue,
                    role: 'Supporting',
                    notes: `Introduced in Scene ${parsed.sceneNumber}`
                });
                cid = newChar.id;
                charMap.set(cue, cid);
            }
            characterIds.push(cid);
        }

        // 3. Match against existing scene by heading to preserve stable scene.id
        // NOTE: Positional fallback removed — it would corrupt stable IDs when scenes are added/removed.
        const existing = existingByHeading.get(headingKey) || null;

        let savedScene;
        if (existing) {
            // Update existing record, preserving stable ID, custom notes, status, and breakdown links
            savedScene = await scenes.update(existing.id, {
                sceneNumber: parsed.sceneNumber,
                heading: parsed.heading,
                intExt: parsed.intExt,
                timeOfDay: parsed.timeOfDay,
                locationId: locationId || existing.locationId,
                locationName: parsed.placeName,
                characterIds: Array.from(new Set([...(existing.characterIds || []), ...characterIds])),
                scriptExcerpt: parsed.excerpt.join('\n'),
                estPages: `${Math.max(1, Math.round((parsed.linesCount / 40) * 8))}/8`
            });
        } else {
            // Create new scene
            savedScene = await scenes.create({
                projectId,
                screenplayId,
                sceneNumber: parsed.sceneNumber,
                heading: parsed.heading,
                intExt: parsed.intExt,
                timeOfDay: parsed.timeOfDay,
                locationId,
                locationName: parsed.placeName,
                characterIds,
                scriptExcerpt: parsed.excerpt.join('\n'),
                estPages: `${Math.max(1, Math.round((parsed.linesCount / 40) * 8))}/8`,
                status: 'draft'
            });
        }
        synchronizedScenes.push(savedScene);
    }

    return synchronizedScenes;
}

// ─── BIDIRECTIONAL RELATIONSHIP TRAVERSAL ─────────────────────────────────────

/**
 * Traverse all records connected to a specific Scene
 */
export async function getSceneLinks(sceneId) {
    const scene = await scenes.get(sceneId);
    if (!scene) return null;

    const projectId = scene.projectId;

    const [
        allCharacters,
        location,
        bItems,
        stbFrames,
        shotList,
        schedEntries,
        allDays,
        allMoodboards,
        allTasks
    ] = await Promise.all([
        characters.getByProject(projectId),
        scene.locationId ? locations.get(scene.locationId) : Promise.resolve(null),
        breakdownItems.getByScene(sceneId),
        storyboards.getByScene(sceneId),
        shots.getByScene(sceneId),
        schedules.getByScene(sceneId),
        shootDays.getByProject(projectId),
        moodboards.getByProject(projectId),
        tasks.getByProject(projectId)
    ]);

    // Filter characters appearing in this scene
    const charIdSet = new Set(scene.characterIds || []);
    const sceneCharacters = allCharacters.filter(c => charIdSet.has(c.id));

    // Resolve schedule shoot day
    const dayMap = new Map(allDays.map(d => [d.id, d]));
    const scheduledDays = schedEntries
        .map(e => ({ ...e, shootDay: dayMap.get(e.shootDayId) }))
        .filter(e => e.shootDay);

    // Linked moodboards & tasks
    const linkedMoodboards = allMoodboards.filter(m => m.linkedEntityId === sceneId || (location && m.linkedEntityId === location.id));
    const linkedTasks = allTasks.filter(t => t.relatedEntityId === sceneId);

    return {
        scene,
        location,
        characters: sceneCharacters,
        breakdownItems: bItems,
        storyboards: stbFrames,
        shots: shotList,
        schedules: scheduledDays,
        moodboards: linkedMoodboards,
        tasks: linkedTasks
    };
}

/**
 * Traverse all records connected to a Character
 */
export async function getCharacterLinks(characterId) {
    const char = await characters.get(characterId);
    if (!char) return null;

    const projectId = char.projectId;

    const [allScenes, allBreakdown, allStoryboards, allCallSheets, allMoodboards] = await Promise.all([
        scenes.getByProject(projectId),
        breakdownItems.getByProject(projectId),
        storyboards.getByProject(projectId),
        callSheets.getByProject(projectId),
        moodboards.getByProject(projectId)
    ]);

    // Scenes where character appears
    const connectedScenes = allScenes.filter(s => (s.characterIds || []).includes(characterId));

    // Breakdown items (wardrobe, specific props assigned to character)
    const connectedBreakdown = allBreakdown.filter(b => b.characterId === characterId);

    // Storyboard frames for those scenes
    const sceneIdSet = new Set(connectedScenes.map(s => s.id));
    const connectedStoryboards = allStoryboards.filter(sb => sceneIdSet.has(sb.sceneId));

    // Call sheets with calls for this character
    const connectedCallSheets = allCallSheets.filter(cs => 
        (cs.castCalls || []).some(c => c.characterId === characterId || c.characterName?.toUpperCase() === char.name.toUpperCase())
    );

    // Moodboard references
    const connectedMoodboards = allMoodboards.filter(m => m.linkedEntityId === characterId);

    return {
        character: char,
        scenes: connectedScenes,
        breakdownItems: connectedBreakdown,
        storyboards: connectedStoryboards,
        callSheets: connectedCallSheets,
        moodboards: connectedMoodboards
    };
}

/**
 * Traverse all records connected to a Location
 */
export async function getLocationLinks(locationId) {
    const loc = await locations.get(locationId);
    if (!loc) return null;

    const projectId = loc.projectId;

    const [allScenes, allDays, allMoodboards] = await Promise.all([
        scenes.getByProject(projectId),
        shootDays.getByProject(projectId),
        moodboards.getByProject(projectId)
    ]);

    const connectedScenes = allScenes.filter(s => s.locationId === locationId || (s.locationName && s.locationName.toUpperCase() === loc.name.toUpperCase()));
    const connectedShootDays = allDays.filter(d => d.locationId === locationId);
    const connectedMoodboards = allMoodboards.filter(m => m.linkedEntityId === locationId);

    return {
        location: loc,
        scenes: connectedScenes,
        shootDays: connectedShootDays,
        moodboards: connectedMoodboards
    };
}

/**
 * Traverse all records connected to a Shot
 */
export async function getShotLinks(shotId) {
    const shot = await shots.get(shotId);
    if (!shot) return null;

    const [scene, frame, day] = await Promise.all([
        shot.sceneId ? scenes.get(shot.sceneId) : Promise.resolve(null),
        shot.frameId ? storyboards.get(shot.frameId) : Promise.resolve(null),
        shot.scheduleDayId ? shootDays.get(shot.scheduleDayId) : Promise.resolve(null)
    ]);

    return {
        shot,
        scene,
        storyboardFrame: frame,
        shootDay: day
    };
}

/**
 * Traverse all records connected to a Shoot Day
 */
export async function getShootDayLinks(shootDayId) {
    const day = await shootDays.get(shootDayId);
    if (!day) return null;

    const projectId = day.projectId;

    const [schedEntries, allScenes, allCharacters, callSheet] = await Promise.all([
        schedules.getByShootDay(shootDayId),
        scenes.getByProject(projectId),
        characters.getByProject(projectId),
        callSheets.getByShootDay(shootDayId)
    ]);

    const sceneMap = new Map(allScenes.map(s => [s.id, s]));
    const charMap = new Map(allCharacters.map(c => [c.id, c]));

    const scheduledScenes = schedEntries.map(entry => {
        const scn = sceneMap.get(entry.sceneId);
        const scnChars = scn ? (scn.characterIds || []).map(cid => charMap.get(cid)).filter(Boolean) : [];
        return {
            ...entry,
            scene: scn,
            characters: scnChars
        };
    });

    // Check if call sheet is stale (schedule changed after publication)
    let isStale = false;
    let staleReason = '';

    if (callSheet && callSheet.isPublished && callSheet.publishedAt) {
        const lastScheduleUpdate = Math.max(...schedEntries.map(e => e.updatedAt || 0), 0);
        if (lastScheduleUpdate > callSheet.publishedAt) {
            isStale = true;
            staleReason = 'Shoot day schedule was modified after call sheet publication.';
        }
    }

    return {
        shootDay: day,
        scheduledScenes,
        callSheet,
        isStale,
        staleReason
    };
}

// ─── SAFE CHANGE-PROPAGATION OPERATIONS ───────────────────────────────────────

/**
 * Safely rename a Character without breaking screenplay or scene relationships
 */
export async function safeRenameCharacter(characterId, newName) {
    const char = await characters.get(characterId);
    if (!char) return null;

    const oldName = char.name;
    const cleanName = newName.toUpperCase().trim();

    const updated = await characters.update(characterId, { name: cleanName });

    await activityLogs.log(
        char.projectId,
        'character',
        characterId,
        'renamed',
        `Renamed character cue from "${oldName}" to "${cleanName}"`,
        oldName,
        cleanName
    );

    return updated;
}

/**
 * Safely renumber a Scene while keeping dependent shots, storyboards, and call sheets linked
 */
export async function safeRenumberScene(sceneId, newSceneNumber) {
    const scene = await scenes.get(sceneId);
    if (!scene) return null;

    const oldNumber = scene.sceneNumber;
    const num = parseInt(newSceneNumber, 10) || oldNumber;

    const updated = await scenes.update(sceneId, { sceneNumber: num });

    await activityLogs.log(
        scene.projectId,
        'scene',
        sceneId,
        'renumbered',
        `Renumbered Scene #${oldNumber} to #${num}`,
        oldNumber,
        num
    );

    return updated;
}

/**
 * Safely generate or revise a Call Sheet from the Shoot Day's schedule
 */
export async function generateOrReviseCallSheet(projectId, shootDayId, isNewRevision = false) {
    const dayLinks = await getShootDayLinks(shootDayId);
    if (!dayLinks) throw new Error('Shoot day not found');

    const day = dayLinks.shootDay;
    const scheduled = dayLinks.scheduledScenes;
    const existingSheet = dayLinks.callSheet;

    // Gather unique cast needed
    const castCallsMap = new Map();
    for (const item of scheduled) {
        if (!item.scene) continue;
        for (const char of (item.characters || [])) {
            if (!castCallsMap.has(char.id)) {
                castCallsMap.set(char.id, {
                    characterId: char.id,
                    characterName: char.name,
                    actorName: char.actorName || char.fullName || 'TBD',
                    callTime: day.callTime || '07:00 AM',
                    onSetTime: '08:00 AM',
                    notes: `Scenes: #${item.scene.sceneNumber}`
                });
            } else {
                const rec = castCallsMap.get(char.id);
                rec.notes += `, #${item.scene.sceneNumber}`;
            }
        }
    }

    const castCalls = Array.from(castCallsMap.values());
    const sceneIds = scheduled.map(s => s.sceneId).filter(Boolean);

    // If existing sheet is published and user wants a new revision
    if (existingSheet && existingSheet.isPublished && isNewRevision) {
        const nextRev = (existingSheet.version || 1) + 1;
        const newSheet = await callSheets.create({
            projectId,
            shootDayId,
            title: `${day.title} — Call Sheet (Rev ${nextRev})`,
            version: nextRev,
            isPublished: false,
            date: day.date,
            generalCall: day.callTime,
            estimatedWrap: day.estimatedWrap,
            locationAddress: day.locationName || '',
            generalNotes: existingSheet.generalNotes || '',
            hospital: existingSheet.hospital || '',
            weather: existingSheet.weather || '',
            sceneIds,
            castCalls
        });

        await activityLogs.log(
            projectId,
            'callSheet',
            newSheet.id,
            'created_revision',
            `Created Call Sheet Revision ${nextRev} for ${day.title}`
        );

        return newSheet;
    }

    // Update draft or create initial (only when not published, or when published but no revision requested)
    if (existingSheet && !existingSheet.isPublished) {
        const updated = await callSheets.update(existingSheet.id, {
            date: day.date,
            generalCall: day.callTime,
            estimatedWrap: day.estimatedWrap,
            locationAddress: day.locationName || existingSheet.locationAddress,
            sceneIds,
            castCalls,
            isStale: false
        });
        return updated;
    }

    // If existing sheet is published and no revision was explicitly requested, return it as-is.
    // (A new revision must be created via isNewRevision=true from the UI.)
    if (existingSheet && existingSheet.isPublished && !isNewRevision) {
        return existingSheet;
    }

    // Create fresh draft
    const freshSheet = await callSheets.create({
        projectId,
        shootDayId,
        title: `${day.title} — Call Sheet (Draft)`,
        version: 1,
        isPublished: false,
        date: day.date,
        generalCall: day.callTime,
        estimatedWrap: day.estimatedWrap,
        locationAddress: day.locationName || '',
        sceneIds,
        castCalls
    });

    return freshSheet;
}
