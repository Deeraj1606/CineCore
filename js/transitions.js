/**
 * transitions.js - Screenplay Element Transition Rules
 * Handles smart Enter, Tab cycling, Backspace merging, and typing auto-recognition.
 */

import {
    createBlock,
    changeBlockFormat,
    getCaretCharacterOffset,
    setCaretPosition,
    setCaretToEnd
} from './editor.js';

const TAB_CYCLE = {
    'action': 'character',
    'character': 'parenthetical',
    'parenthetical': 'dialogue',
    'dialogue': 'transition',
    'transition': 'scene-heading',
    'scene-heading': 'action',
    'shot': 'action',
    'script-note': 'action'
};

const REVERSE_TAB_CYCLE = {
    'character': 'action',
    'parenthetical': 'character',
    'dialogue': 'parenthetical',
    'transition': 'dialogue',
    'scene-heading': 'transition',
    'action': 'scene-heading',
    'shot': 'scene-heading',
    'script-note': 'action'
};

const NEXT_ELEMENT_ON_ENTER = {
    'scene-heading': 'action',
    'action': 'action',
    'character': 'dialogue',
    'parenthetical': 'dialogue',
    'dialogue': 'character',
    'transition': 'scene-heading',
    'shot': 'action',
    'script-note': 'action'
};

/**
 * Handle Enter Key
 */
export function handleEnter(block) {
    if (!block) return null;

    const currentFormat = block.getAttribute('data-type') || 'action';

    // Special handling for Dual Dialogue block navigation
    if (currentFormat === 'dual-dialogue') {
        const sel = window.getSelection();
        const anchor = sel?.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentNode : sel.anchorNode) : null;
        const inLeftCol = anchor?.closest('.dual-col-left');
        const inRightCol = anchor?.closest('.dual-col-right');
        const inChar = anchor?.closest('.dual-char');
        const inDial = anchor?.closest('.dual-dial');

        if (inLeftCol && inChar) {
            const dial = block.querySelector('.dual-col-left .dual-dial');
            if (dial) setCaretToEnd(dial);
            return { action: 'dual-navigated', block: dial };
        } else if (inLeftCol && inDial) {
            const rightChar = block.querySelector('.dual-col-right .dual-char');
            if (rightChar) setCaretToEnd(rightChar);
            return { action: 'dual-navigated', block: rightChar };
        } else if (inRightCol && inChar) {
            const dial = block.querySelector('.dual-col-right .dual-dial');
            if (dial) setCaretToEnd(dial);
            return { action: 'dual-navigated', block: dial };
        } else if (inRightCol && inDial) {
            // Drop out into a new Action block below dual dialogue
            const newBlock = createBlock('action', '');
            block.after(newBlock);
            setCaretToEnd(newBlock);
            return { action: 'block-created', block: newBlock, newFormat: 'action' };
        } else {
            const newBlock = createBlock('action', '');
            block.after(newBlock);
            setCaretToEnd(newBlock);
            return { action: 'block-created', block: newBlock, newFormat: 'action' };
        }
    }

    const rawText = (block.innerText || block.textContent || '').replace(/\r?\n/g, '');
    const trimmed = rawText.trim();
    const caretOffset = getCaretCharacterOffset(block);

    // --- Case 1: Enter on an EMPTY Block ---
    if (trimmed === '' || rawText === '') {
        if (currentFormat === 'character' || currentFormat === 'dialogue') {
            changeBlockFormat(block, 'action');
            setCaretToEnd(block);
            return { action: 'format-changed', block, newFormat: 'action' };
        } else if (currentFormat === 'parenthetical') {
            changeBlockFormat(block, 'dialogue');
            setCaretToEnd(block);
            return { action: 'format-changed', block, newFormat: 'dialogue' };
        } else if (currentFormat === 'transition') {
            changeBlockFormat(block, 'scene-heading');
            setCaretToEnd(block);
            return { action: 'format-changed', block, newFormat: 'scene-heading' };
        } else {
            const newBlock = createBlock('action', '');
            block.after(newBlock);
            setCaretToEnd(newBlock);
            return { action: 'block-created', block: newBlock, newFormat: 'action' };
        }
    }

    // --- Case 2: Enter on a Block WITH Text (Text Splitting) ---
    const textBefore = rawText.slice(0, caretOffset);
    const textAfter = rawText.slice(caretOffset);
    const nextFormat = NEXT_ELEMENT_ON_ENTER[currentFormat] || 'action';

    if (textBefore.trim() === '') {
        block.innerHTML = '<br>';
    } else {
        block.textContent = textBefore;
    }

    const newBlock = createBlock(nextFormat, textAfter);
    block.after(newBlock);

    if (nextFormat === 'parenthetical' && newBlock.textContent === '()') {
        setCaretPosition(newBlock, 1);
    } else {
        setCaretPosition(newBlock, 0);
    }

    return { action: 'block-created', block: newBlock, newFormat: nextFormat };
}

/**
 * Handle Tab Key
 */
export function handleTab(block, isShift = false) {
    if (!block) return null;

    const currentFormat = block.getAttribute('data-type') || 'action';

    // Special handling for Dual Dialogue column navigation
    if (currentFormat === 'dual-dialogue') {
        const sel = window.getSelection();
        const anchor = sel?.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentNode : sel.anchorNode) : null;
        const inLeftCol = anchor?.closest('.dual-col-left');
        const inRightCol = anchor?.closest('.dual-col-right');
        const inChar = anchor?.closest('.dual-char');
        const inDial = anchor?.closest('.dual-dial');

        if (!isShift) {
            if (inLeftCol && inChar) {
                const dial = block.querySelector('.dual-col-left .dual-dial');
                if (dial) { setCaretToEnd(dial); return { block: dial, newFormat: 'dual-dialogue' }; }
            } else if (inLeftCol && inDial) {
                const char = block.querySelector('.dual-col-right .dual-char');
                if (char) { setCaretToEnd(char); return { block: char, newFormat: 'dual-dialogue' }; }
            } else if (inRightCol && inChar) {
                const dial = block.querySelector('.dual-col-right .dual-dial');
                if (dial) { setCaretToEnd(dial); return { block: dial, newFormat: 'dual-dialogue' }; }
            } else {
                const leftChar = block.querySelector('.dual-col-left .dual-char');
                if (leftChar) { setCaretToEnd(leftChar); return { block: leftChar, newFormat: 'dual-dialogue' }; }
            }
        } else {
            if (inRightCol && inDial) {
                const char = block.querySelector('.dual-col-right .dual-char');
                if (char) { setCaretToEnd(char); return { block: char, newFormat: 'dual-dialogue' }; }
            } else if (inRightCol && inChar) {
                const dial = block.querySelector('.dual-col-left .dual-dial');
                if (dial) { setCaretToEnd(dial); return { block: dial, newFormat: 'dual-dialogue' }; }
            } else if (inLeftCol && inDial) {
                const char = block.querySelector('.dual-col-left .dual-char');
                if (char) { setCaretToEnd(char); return { block: char, newFormat: 'dual-dialogue' }; }
            }
        }
        return { block, newFormat: 'dual-dialogue' };
    }

    const newFormat = isShift ? REVERSE_TAB_CYCLE[currentFormat] : TAB_CYCLE[currentFormat];

    changeBlockFormat(block, newFormat);
    setCaretToEnd(block);

    return { block, newFormat };
}

/**
 * Handle Backspace Key
 */
export function handleBackspace(block) {
    if (!block) return false;

    const currentFormat = block.getAttribute('data-type') || 'action';

    // Special handling for Dual Dialogue blocks
    if (currentFormat === 'dual-dialogue') {
        const text = (block.innerText || block.textContent || '').replace(/\r?\n/g, '').trim();
        if (text === '') {
            const newBlock = createBlock('action', '');
            block.replaceWith(newBlock);
            setCaretToEnd(newBlock);
            return true;
        }

        const sel = window.getSelection();
        const anchor = sel?.anchorNode ? (sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentNode : sel.anchorNode) : null;
        const inRightCol = anchor?.closest('.dual-col-right');
        const inChar = anchor?.closest('.dual-char');
        const inDial = anchor?.closest('.dual-dial');

        if (inRightCol && inChar) {
            const offset = getCaretCharacterOffset(inChar);
            if (offset === 0) {
                const leftDial = block.querySelector('.dual-col-left .dual-dial');
                if (leftDial) { setCaretToEnd(leftDial); return true; }
            }
        } else if (inDial) {
            const offset = getCaretCharacterOffset(inDial);
            if (offset === 0) {
                const col = inDial.closest('.dual-col');
                const char = col?.querySelector('.dual-char');
                if (char) { setCaretToEnd(char); return true; }
            }
        }
        return false;
    }

    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return false; // Native deletion of selected range

    const caretOffset = getCaretCharacterOffset(block);
    if (caretOffset !== 0) return false; // Not at start of block

    const prevBlock = block.previousElementSibling;
    if (!prevBlock || !prevBlock.classList.contains('script-block')) {
        const curText = (block.innerText || block.textContent || '').replace(/\r?\n/g, '').trim();
        if (curText === '' && block.getAttribute('data-type') !== 'scene-heading') {
            changeBlockFormat(block, 'scene-heading');
            return true;
        }
        return false;
    }

    const curText = (block.innerText || block.textContent || '').replace(/\r?\n/g, '');

    if (curText.trim() === '') {
        block.remove();
        setCaretToEnd(prevBlock);
    } else {
        const prevText = (prevBlock.innerText || prevBlock.textContent || '').replace(/\r?\n/g, '');
        const mergePos = prevText.length;

        if (prevBlock.innerHTML === '<br>') {
            prevBlock.textContent = curText;
        } else {
            prevBlock.textContent = prevText + curText;
        }

        block.remove();
        setCaretPosition(prevBlock, mergePos);
    }

    return true;
}

/**
 * Auto-recognize element types while typing
 */
export function checkAutoRecognition(block) {
    if (!block) return null;

    const raw = (block.innerText || block.textContent || '').replace(/\r?\n/g, '').trim();
    const upper = raw.toUpperCase();
    const type = block.getAttribute('data-type');

    // 1. Slugline detection
    if (type !== 'scene-heading' &&
        (upper.startsWith('INT.') || upper.startsWith('EXT.') ||
         upper.startsWith('INT/EXT.') || upper.startsWith('I/E.') ||
         upper.startsWith('EST.'))) {
        changeBlockFormat(block, 'scene-heading');
        return 'scene-heading';
    }

    // 2. Parenthetical detection
    if ((type === 'dialogue' || type === 'action') && raw.startsWith('(')) {
        changeBlockFormat(block, 'parenthetical');
        return 'parenthetical';
    }

    // 3. Transition detection
    if (type !== 'transition' &&
        (upper.endsWith('TO:') || upper === 'FADE IN:' || upper === 'FADE OUT.' || upper === 'DISSOLVE TO:')) {
        changeBlockFormat(block, 'transition');
        return 'transition';
    }

    return null;
}
