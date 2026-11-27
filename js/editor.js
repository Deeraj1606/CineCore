/**
 * editor.js - Core Screenplay & Multi-Format DOM, Caret & Inline Formatting Management
 * Encapsulates contenteditable operations, inline styling (bold/italic/underline),
 * entity tagging chips, caret preservation, and accurate metrics calculation.
 */

export const WRITING_FORMATS = {
    screenplay: {
        id: 'screenplay',
        label: 'Screenplay / Feature Film',
        icon: 'screenplay',
        types: [
            { id: 'scene-heading', label: 'Scene Heading', shortcut: 'Ctrl+1' },
            { id: 'action', label: 'Action', shortcut: 'Ctrl+2' },
            { id: 'character', label: 'Character', shortcut: 'Ctrl+3' },
            { id: 'parenthetical', label: 'Parenthetical', shortcut: 'Ctrl+4' },
            { id: 'dialogue', label: 'Dialogue', shortcut: 'Ctrl+5' },
            { id: 'transition', label: 'Transition', shortcut: 'Ctrl+6' },
            { id: 'shot', label: 'Shot', shortcut: 'Ctrl+7' },
            { id: 'script-note', label: 'Note', shortcut: 'Ctrl+8' },
            { id: 'dual-dialogue', label: 'Dual Dialogue', shortcut: 'Ctrl+Shift+D' }
        ]
    },
    stageplay: {
        id: 'stageplay',
        label: 'Stage Play',
        icon: 'stageplay',
        types: [
            { id: 'stage-act', label: 'Act Header', shortcut: 'Ctrl+1' },
            { id: 'stage-scene', label: 'Scene Header', shortcut: 'Ctrl+2' },
            { id: 'stage-character', label: 'Character Cue', shortcut: 'Ctrl+3' },
            { id: 'stage-dialogue', label: 'Dialogue', shortcut: 'Ctrl+4' },
            { id: 'stage-direction', label: 'Stage Direction', shortcut: 'Ctrl+5' },
            { id: 'stage-transition', label: 'Entrance / Exit', shortcut: 'Ctrl+6' }
        ]
    },
    documentary: {
        id: 'documentary',
        label: 'Documentary & Interview',
        icon: 'documentary',
        types: [
            { id: 'doc-narration', label: 'Voiceover Narration', shortcut: 'Ctrl+1' },
            { id: 'doc-interview-q', label: 'Interviewer Question', shortcut: 'Ctrl+2' },
            { id: 'doc-interview-a', label: 'Subject Response', shortcut: 'Ctrl+3' },
            { id: 'doc-visual-note', label: 'Visual Note / B-Roll', shortcut: 'Ctrl+4' },
            { id: 'doc-audio-note', label: 'Audio / SFX Cue', shortcut: 'Ctrl+5' }
        ]
    },
    av: {
        id: 'av',
        label: 'AV Script (Two-Column)',
        icon: 'av',
        types: [
            { id: 'av-video', label: 'Visual / Camera Column', shortcut: 'Ctrl+1' },
            { id: 'av-audio', label: 'Audio / VO Column', shortcut: 'Ctrl+2' }
        ]
    },
    prose: {
        id: 'prose',
        label: 'Creative Writing & Prose',
        icon: 'prose',
        types: [
            { id: 'prose-chapter', label: 'Chapter Title', shortcut: 'Ctrl+1' },
            { id: 'prose-heading', label: 'Section Heading', shortcut: 'Ctrl+2' },
            { id: 'prose-paragraph', label: 'Body Paragraph', shortcut: 'Ctrl+3' },
            { id: 'prose-quote', label: 'Blockquote', shortcut: 'Ctrl+4' },
            { id: 'prose-note', label: 'Author Memo / Note', shortcut: 'Ctrl+5' }
        ]
    }
};

export const ELEMENT_TYPES = [
    'scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition', 'shot',
    'dual-dialogue', 'script-note',
    'stage-act', 'stage-scene', 'stage-character', 'stage-dialogue', 'stage-direction', 'stage-transition',
    'doc-narration', 'doc-interview-q', 'doc-interview-a', 'doc-visual-note', 'doc-audio-note',
    'av-video', 'av-audio',
    'prose-chapter', 'prose-heading', 'prose-paragraph', 'prose-quote', 'prose-note'
];

/**
 * Ensures the editor has valid screenplay blocks and normalizes malformed nodes
 */
export function sanitizeDOM(editor, format = 'screenplay') {
    if (!editor) return;

    const childNodes = Array.from(editor.childNodes);
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim().length > 0) {
                const block = createBlock('action', node.textContent);
                editor.replaceChild(block, node);
            } else {
                node.remove();
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('script-block')) {
            node.className = 'script-block action';
            node.setAttribute('data-type', 'action');
        }
    });

    const blocks = editor.querySelectorAll('.script-block');
    if (blocks.length === 0) {
        const initial = createBlock('scene-heading', 'INT. NEW SCENE - DAY');
        editor.appendChild(initial);
        return initial;
    }

    blocks.forEach(b => {
        const type = b.getAttribute('data-type') || 'action';
        b.setAttribute('data-type', type);
        if (!b.classList.contains(type)) {
            b.classList.add(type);
        }
        if (b.textContent.trim() === '' && !b.querySelector('br')) {
            b.innerHTML = '<br>';
        }
    });

    return blocks[0];
}

/**
 * Creates a script block element
 */
export function createBlock(format = 'action', text = '') {
    const div = document.createElement('div');
    div.className = `script-block ${format}`;
    div.setAttribute('data-type', format);

    if (format === 'parenthetical' && text.trim() === '') {
        div.textContent = '()';
    } else if (text.trim() === '') {
        div.innerHTML = '<br>';
    } else {
        div.textContent = text;
    }

    return div;
}

/**
 * Safely locates the active block element containing the caret
 */
export function getCurrentBlock(editor) {
    if (!editor) return null;
    const sel = window.getSelection();

    if (!sel || !sel.anchorNode) {
        return editor.querySelector('.script-block') || sanitizeDOM(editor);
    }

    let node = sel.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    while (node && node !== editor && node !== document.body) {
        if (node.classList && node.classList.contains('script-block')) {
            return node;
        }
        node = node.parentNode;
    }

    if (sel.anchorNode === editor) {
        const blocks = editor.querySelectorAll('.script-block');
        if (blocks.length > 0) {
            const idx = Math.min(sel.anchorOffset, blocks.length - 1);
            return blocks[idx] || blocks[blocks.length - 1];
        }
    }

    return editor.querySelector('.script-block') || sanitizeDOM(editor);
}

/**
 * Character offset of caret relative to element
 */
export function getCaretCharacterOffset(element) {
    let caretOffset = 0;
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }

    return caretOffset;
}

/**
 * Places caret precisely at character offset
 */
export function setCaretPosition(element, offset = 0) {
    if (!element) return;
    element.focus();

    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();

    if (element.innerHTML === '<br>' || element.textContent === '') {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(true);
        sel.addRange(range);
        return;
    }

    let charCount = 0;
    let found = false;
    const range = document.createRange();

    function traverse(node) {
        if (found) return;

        if (node.nodeType === Node.TEXT_NODE) {
            const nextCharCount = charCount + node.length;
            if (!found && (offset <= nextCharCount || offset === -1)) {
                const targetOffset = (offset === -1 || offset > nextCharCount) ? node.length : (offset - charCount);
                range.setStart(node, Math.max(0, Math.min(node.length, targetOffset)));
                range.collapse(true);
                found = true;
                return;
            }
            charCount = nextCharCount;
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
                if (found) return;
            }
        }
    }

    traverse(element);

    if (!found) {
        range.selectNodeContents(element);
        range.collapse(false);
    }

    sel.addRange(range);
}

export function setCaretToEnd(element) {
    setCaretPosition(element, -1);
}

/**
 * Changes block format and adjusts casing / parentheticals
 */
export function changeBlockFormat(block, newFormat) {
    if (!block || !ELEMENT_TYPES.includes(newFormat)) return;

    ELEMENT_TYPES.forEach(t => block.classList.remove(t));
    block.classList.add(newFormat);
    block.setAttribute('data-type', newFormat);

    // If block has inline tags, preserve HTML; otherwise clean text
    const hasTags = block.querySelector('.script-tag');
    let text = (block.innerText || block.textContent || '').replace(/\r?\n/g, '').trim();

    if (newFormat === 'script-note') {
        const cleanNote = text.replace(/^📝\s*NOTE:\s*/i, '');
        block.innerHTML = `<span class="note-prefix" contenteditable="false">📝 NOTE:</span> <span class="note-content" contenteditable="true">${cleanNote || 'Note...'}</span>`;
        return;
    } else if (newFormat === 'dual-dialogue') {
        block.innerHTML = `
            <div class="dual-col dual-col-left">
                <div class="dual-char" contenteditable="true">CHARACTER 1</div>
                <div class="dual-dial" contenteditable="true">Dialogue 1</div>
            </div>
            <div class="dual-col dual-col-right">
                <div class="dual-char" contenteditable="true">CHARACTER 2</div>
                <div class="dual-dial" contenteditable="true">Dialogue 2</div>
            </div>
        `;
        return;
    }

    if (newFormat === 'parenthetical') {
        text = text.replace(/^\(+|\)+$/g, '').trim();
        block.textContent = text ? `(${text})` : '()';
    } else if (['character', 'scene-heading', 'transition', 'shot', 'stage-act', 'stage-scene', 'stage-character'].includes(newFormat)) {
        if (!hasTags && text) {
            block.textContent = text.toUpperCase();
        }
    }

    if (block.textContent.trim() === '') {
        block.innerHTML = '<br>';
    }
}

/**
 * Inline rich text formatting (bold, italic, underline, strikethrough)
 */
export function applyInlineStyle(command) {
    document.execCommand(command, false, null);
}

/**
 * Inserts an inline Entity Tag chip (@Character, #Location, !Prop, etc.)
 */
export function insertScriptTag(type, label, entityId = '') {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const tagSpan = document.createElement('span');
    tagSpan.className = `script-tag tag-${type}`;
    tagSpan.setAttribute('contenteditable', 'false');
    tagSpan.setAttribute('data-tag-type', type);
    tagSpan.setAttribute('data-tag-id', entityId || '');

    const prefix = type === 'character' ? '@' : type === 'location' ? '#' : type === 'prop' ? '!' : '%';
    tagSpan.textContent = `${prefix}${label.toUpperCase().trim()}`;

    range.insertNode(tagSpan);

    // Add trailing space so user can keep typing outside the tag
    const spaceNode = document.createTextNode(' ');
    tagSpan.after(spaceNode);

    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
}

/**
 * Creates a dual dialogue block containing two parallel speech columns
 */
export function createDualDialogueBlock(char1 = 'CHARACTER 1', dial1 = 'Dialogue 1', char2 = 'CHARACTER 2', dial2 = 'Dialogue 2') {
    const row = document.createElement('div');
    row.className = 'script-block dual-dialogue';
    row.setAttribute('data-type', 'dual-dialogue');

    row.innerHTML = `
        <div class="dual-col dual-col-left">
            <div class="dual-char" contenteditable="true">${char1.toUpperCase()}</div>
            <div class="dual-dial" contenteditable="true">${dial1}</div>
        </div>
        <div class="dual-col dual-col-right">
            <div class="dual-char" contenteditable="true">${char2.toUpperCase()}</div>
            <div class="dual-dial" contenteditable="true">${dial2}</div>
        </div>
    `;

    return row;
}

/**
 * Inserts an author script note block [[NOTE: ...]]
 */
export function insertScriptNote(noteText = 'Script Note') {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const block = document.createElement('div');
    block.className = 'script-block script-note';
    block.setAttribute('data-type', 'script-note');
    block.innerHTML = `<span class="note-prefix" contenteditable="false">📝 NOTE:</span> <span class="note-content" contenteditable="true">${noteText}</span>`;

    const activeBlock = getCurrentBlock(document.getElementById('editor'));
    if (activeBlock && activeBlock.parentNode) {
        activeBlock.after(block);
        setCaretToEnd(block.querySelector('.note-content') || block);
    }
    return block;
}

/**
 * Extracts blocks as structured array, properly handling dual dialogue and script notes
 */
export function extractEditorBlocks(editor) {
    if (!editor) return [];
    const elements = Array.from(editor.children);
    const result = [];

    elements.forEach(b => {
        if (!b.classList.contains('script-block')) return;
        const type = b.getAttribute('data-type') || 'action';

        if (type === 'dual-dialogue') {
            const leftChar = (b.querySelector('.dual-col-left .dual-char')?.textContent || '').trim();
            const leftDial = (b.querySelector('.dual-col-left .dual-dial')?.textContent || '').trim();
            const rightChar = (b.querySelector('.dual-col-right .dual-char')?.textContent || '').trim();
            const rightDial = (b.querySelector('.dual-col-right .dual-dial')?.textContent || '').trim();

            if (leftChar || leftDial) {
                result.push({ type: 'character', text: leftChar, isDual: false });
                result.push({ type: 'dialogue', text: leftDial, isDual: false });
            }
            if (rightChar || rightDial) {
                result.push({ type: 'character', text: rightChar, isDual: true });
                result.push({ type: 'dialogue', text: rightDial, isDual: true });
            }
        } else if (type === 'script-note') {
            const text = (b.querySelector('.note-content')?.textContent || b.textContent || '').replace(/^📝\s*NOTE:\s*/i, '').trim();
            result.push({ type: 'script-note', text, html: b.innerHTML });
        } else {
            result.push({
                type,
                text: (b.innerText || b.textContent || '').replace(/\r?\n/g, '').trim(),
                html: b.innerHTML
            });
        }
    });

    return result;
}

/**
 * Computes real, accurate text metrics without HTML tag or decorative markup pollution
 */
export function computeAccurateStats(editor) {
    if (!editor) return { words: 0, characters: 0, paragraphs: 0, scenes: 0, pages: 1, readingMinutes: 1, tags: 0 };

    const blocks = Array.from(editor.querySelectorAll('.script-block'));
    let totalWords = 0;
    let totalChars = 0;
    let sceneCount = 0;
    let tagCount = editor.querySelectorAll('.script-tag').length;

    blocks.forEach(b => {
        const type = b.getAttribute('data-type') || 'action';
        if (['scene-heading', 'stage-scene', 'stage-act', 'prose-chapter'].includes(type)) {
            sceneCount++;
        }

        // Clone and remove tags to get pure words
        const clone = b.cloneNode(true);
        const text = clone.innerText || clone.textContent || '';
        const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

        if (cleanText) {
            const wordsArr = cleanText.split(/\s+/).filter(w => w.length > 0 && !/^[@#!%^&*]$/.test(w));
            totalWords += wordsArr.length;
            totalChars += cleanText.length;
        }
    });

    const paragraphs = blocks.length;
    // Standard screenplay page rule: ~250 words per page or ~55 blocks per page
    const pages = Math.max(1, Math.ceil(totalWords / 250));
    const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

    return {
        words: totalWords,
        characters: totalChars,
        paragraphs,
        scenes: sceneCount,
        pages,
        readingMinutes,
        tags: tagCount
    };
}
