/**
 * parser.worker.js - Background Screenplay Parsing Web Worker
 * Parses screenplay elements, extracts autocomplete indexes, calculates statistics,
 * and formats exports off the main UI thread.
 */

self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'PARSE_SCRIPT':
            handleParseScript(payload);
            break;

        case 'GENERATE_FOUNTAIN':
            handleGenerateFountain(payload);
            break;

        default:
            console.warn('Unknown worker message type:', type);
    }
};

function handleParseScript(payload) {
    const blocks = payload.blocks || []; // Array of { type, text }

    const charactersMap = new Map(); // name -> count
    const locationsMap = new Map();  // location -> count
    const sceneHeadings = [];

    let totalWords = 0;
    let dialogueWordCount = 0;
    let actionWordCount = 0;
    let totalLines = 0;
    const issues = [];

    const timesOfDay = new Set(['DAY', 'NIGHT', 'CONTINUOUS', 'LATER', 'EVENING', 'MORNING', 'DAWN', 'DUSK', 'MOMENTS LATER']);

    blocks.forEach((block, index) => {
        const type = block.type || 'action';
        const text = (block.text || '').trim();
        if (!text) return;

        // Word count
        const words = text.split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
        totalLines += Math.max(1, Math.ceil(text.length / 60));

        if (type === 'scene-heading') {
            const upper = text.toUpperCase();
            sceneHeadings.push(upper);

            // Extract location: INT. LOCATION - TIME
            const match = upper.match(/(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s+(.*?)\s+-\s*(.*)/);
            if (match && match[1]) {
                const loc = match[1].trim();
                if (loc) {
                    locationsMap.set(loc, (locationsMap.get(loc) || 0) + 1);
                }
            }
        } else if (type === 'character') {
            // Strip extensions like (V.O.) or (O.S.)
            const cleanName = text.replace(/\(.*\)/g, '').trim().toUpperCase();
            if (cleanName.length > 0) {
                charactersMap.set(cleanName, (charactersMap.get(cleanName) || 0) + 1);
            }
        } else if (type === 'dialogue') {
            dialogueWordCount += words.length;

            // Check if previous block was character or parenthetical
            if (index > 0) {
                const prevType = blocks[index - 1].type;
                if (prevType !== 'character' && prevType !== 'parenthetical') {
                    issues.push({ index, message: 'Dialogue not preceded by Character or Parenthetical' });
                }
            }
        } else if (type === 'parenthetical') {
            if (!text.startsWith('(') || !text.endsWith(')')) {
                issues.push({ index, message: 'Parenthetical should be enclosed in parentheses' });
            }
        } else if (type === 'action') {
            actionWordCount += words.length;
        }
    });

    // Approximate Screenplay Page Calculation (54 lines per page standard)
    const estimatedPages = Math.max(1, Math.ceil(totalLines / 54));
    const estimatedMinutes = estimatedPages; // 1 page ≈ 1 minute screen time

    // Sort characters by frequency
    const sortedCharacters = Array.from(charactersMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

    // Sort locations by frequency
    const sortedLocations = Array.from(locationsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([loc]) => loc);

    self.postMessage({
        type: 'PARSED_RESULT',
        payload: {
            characters: sortedCharacters,
            locations: sortedLocations,
            sceneCount: sceneHeadings.length,
            wordCount: totalWords,
            dialogueWordCount,
            actionWordCount,
            estimatedPages,
            estimatedMinutes,
            issues
        }
    });
}

function handleGenerateFountain(payload) {
    const { title, author, source, contact, blocks } = payload;
    const lines = [];

    if (title && title.trim()) {
        lines.push(`Title: ${title.trim()}`);
        if (author && author.trim()) lines.push(`Author: ${author.trim()}`);
        if (source && source.trim()) lines.push(`Source: ${source.trim()}`);
        if (contact && contact.trim()) lines.push(`Contact:\n    ${contact.trim().replace(/\n/g, '\n    ')}`);
        lines.push('\n');
    }

    (blocks || []).forEach(b => {
        const type = b.type;
        const text = (b.text || '').trim();
        if (!text) {
            lines.push('');
            return;
        }

        switch (type) {
            case 'scene-heading':
                lines.push(`\n${text}`);
                break;
            case 'character':
                lines.push(`\n${text.toUpperCase()}`);
                break;
            case 'parenthetical':
                lines.push(text);
                break;
            case 'dialogue':
                lines.push(text);
                break;
            case 'transition':
                lines.push(`\n> ${text}`);
                break;
            default:
                lines.push(`\n${text}`);
        }
    });

    self.postMessage({
        type: 'FOUNTAIN_RESULT',
        payload: {
            fountainText: lines.join('\n')
        }
    });
}
