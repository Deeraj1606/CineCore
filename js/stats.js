/**
 * stats.js - Real-time Screenplay Metrics
 * Coordinates with the background parser worker to display live word, scene, and screen time counts.
 */

export class StatsManager {
    constructor(elements = {}) {
        this.statWords = elements.words;
        this.statScenes = elements.scenes;
        this.statTime = elements.time;
    }

    updateFromWorker(payload) {
        if (!payload) return;

        if (this.statWords) {
            this.statWords.textContent = `${payload.wordCount || 0} Word${payload.wordCount !== 1 ? 's' : ''}`;
        }

        if (this.statScenes) {
            this.statScenes.textContent = `${payload.sceneCount || 0} Scene${payload.sceneCount !== 1 ? 's' : ''}`;
        }

        if (this.statTime) {
            this.statTime.textContent = `~${payload.estimatedMinutes || 1} min screen time`;
        }
    }

    quickUpdate(editor) {
        if (!editor) return;

        const text = editor.innerText || editor.textContent || '';
        const words = text.split(/\s+/).filter(w => w.trim().length > 0).length;
        const scenes = editor.querySelectorAll('.script-block.scene-heading').length;

        if (this.statWords) {
            this.statWords.textContent = `${words} Word${words !== 1 ? 's' : ''}`;
        }

        if (this.statScenes) {
            this.statScenes.textContent = `${scenes} Scene${scenes !== 1 ? 's' : ''}`;
        }
    }
}

export function analyzeScript(editor) {
    if (!editor) return { characters: [], locations: [] };

    const blocks = Array.from(editor.querySelectorAll('.script-block'));
    
    const characters = new Map();
    const locations = new Map();
    
    let currentSceneCharacters = new Set();
    let lastCharacter = null;
    
    blocks.forEach(block => {
        const type = block.getAttribute('data-type');
        const text = block.textContent.trim();
        if (!text) return;

        const upperText = text.toUpperCase();
        
        if (type === 'scene-heading') {
            // Process the previous scene's characters
            currentSceneCharacters.forEach(char => {
                if (characters.has(char)) {
                    characters.get(char).sceneCount++;
                }
            });
            currentSceneCharacters.clear();
            lastCharacter = null;

            const match = upperText.match(/(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s+(.*?)(?:\s+-\s*(.*))?$/);
            if (match && match[1]) {
                const locName = match[1].trim();
                const timeOfDay = (match[2] || '').trim();
                
                if (!locations.has(locName)) {
                    locations.set(locName, { name: locName, sceneCount: 0, timesOfDay: new Set() });
                }
                const locStats = locations.get(locName);
                locStats.sceneCount++;
                if (timeOfDay) locStats.timesOfDay.add(timeOfDay);
            }
        } else if (type === 'character') {
            const charName = upperText.replace(/\(.*?\)/g, '').trim();
            if (charName) {
                if (!characters.has(charName)) {
                    characters.set(charName, { name: charName, sceneCount: 0, dialogueBlocks: 0, wordsSpoken: 0 });
                }
                currentSceneCharacters.add(charName);
                lastCharacter = charName;
            }
        } else if (type === 'dialogue') {
            if (lastCharacter && characters.has(lastCharacter)) {
                const charStats = characters.get(lastCharacter);
                charStats.dialogueBlocks++;
                charStats.wordsSpoken += text.split(/\s+/).filter(w => w.length > 0).length;
            }
        } else if (type === 'action' || type === 'transition' || type === 'shot') {
            lastCharacter = null;
        }
    });
    
    // Process the final scene's characters
    currentSceneCharacters.forEach(char => {
        if (characters.has(char)) {
            characters.get(char).sceneCount++;
        }
    });

    // Also build a linear array of scenes for production breakdown
    const scenesList = [];
    let currentSceneObj = null;
    let sceneCounter = 1;

    blocks.forEach(block => {
        const type = block.getAttribute('data-type');
        const text = block.textContent.trim();
        if (!text) return;

        if (type === 'scene-heading') {
            if (currentSceneObj) scenesList.push(currentSceneObj);
            
            const upperText = text.toUpperCase();
            let intExt = '';
            let locName = upperText;
            let time = '';

            const match = upperText.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s+(.*?)(?:\s+-\s*(.*))?$/);
            if (match) {
                intExt = match[1].trim();
                locName = match[2] ? match[2].trim() : '';
                time = match[3] ? match[3].trim() : '';
            }

            currentSceneObj = {
                number: sceneCounter++,
                intExt: intExt,
                location: locName,
                time: time,
                cast: new Set(),
                lengthStr: '1/8' // Simplified estimation
            };
        } else if (type === 'character' && currentSceneObj) {
            const charName = text.replace(/\(.*?\)/g, '').trim().toUpperCase();
            if (charName) currentSceneObj.cast.add(charName);
        }
    });
    if (currentSceneObj) scenesList.push(currentSceneObj);
    
    return {
        characters: Array.from(characters.values()).sort((a, b) => b.dialogueBlocks - a.dialogueBlocks),
        locations: Array.from(locations.values()).sort((a, b) => b.sceneCount - a.sceneCount),
        scenes: scenesList.map(s => ({ ...s, cast: Array.from(s.cast) }))
    };
}
