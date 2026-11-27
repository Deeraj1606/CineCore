/**
 * shortcuts.js - Screenplay & Multi-Format Hotkeys & Keyboard Routing
 * Supports formatting (Ctrl+1..7), bold (Ctrl+B), italic (Ctrl+I), underline (Ctrl+U),
 * find & replace (Ctrl+F), save (Ctrl+S), and undo/redo history.
 */

import { changeBlockFormat, getCurrentBlock, sanitizeDOM, setCaretToEnd, applyInlineStyle } from './editor.js';

const FORMAT_HOTKEYS = {
    '1': 'scene-heading',
    '2': 'action',
    '3': 'character',
    '4': 'parenthetical',
    '5': 'dialogue',
    '6': 'transition',
    '7': 'shot',
    '8': 'script-note'
};

export class ShortcutManager {
    constructor(options = {}) {
        this.editor = options.editor;
        this.onSave = options.onSave || (() => {});
        this.onOpen = options.onOpen || (() => {});
        this.onFormatChanged = options.onFormatChanged || (() => {});
        this.onEscape = options.onEscape || (() => {});
        this.onAddNote = options.onAddNote || null;
        this.onCommandPalette = options.onCommandPalette || null;
        this.onFindReplace = options.onFindReplace || null;
        this.onZenMode = options.onZenMode || null;
        this.onTypewriter = options.onTypewriter || null;
        this.onSceneNumbers = options.onSceneNumbers || null;
        this.onDualDialogue = options.onDualDialogue || null;
        this.onExportPDF = options.onExportPDF || null;

        this.history = [];
        this.historyIndex = -1;
        this.isUndoRedoAction = false;
        this.maxHistory = 50;
    }

    attach(editor) {
        this.editor = editor;
        this.pushUndoState();
    }

    pushUndoState() {
        if (this.isUndoRedoAction || !this.editor) return;

        const currentHTML = this.editor.innerHTML;
        if (this.historyIndex >= 0 && this.history[this.historyIndex] === currentHTML) return;

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(currentHTML);
        this.historyIndex++;

        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.applyHistorySnapshot();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.applyHistorySnapshot();
        }
    }

    applyHistorySnapshot() {
        this.isUndoRedoAction = true;
        this.editor.innerHTML = this.history[this.historyIndex];
        sanitizeDOM(this.editor);
        const block = getCurrentBlock(this.editor);
        if (block) setCaretToEnd(block);
        this.onFormatChanged(block ? block.getAttribute('data-type') : 'action');
        setTimeout(() => { this.isUndoRedoAction = false; }, 30);
    }

    handleKeyDown(e) {
        const isModifier = e.ctrlKey || e.metaKey;

        // Escape: dismiss modals, autocomplete, find/replace
        if (e.key === 'Escape') {
            this.onEscape();
            return true;
        }

        // Save: Ctrl+S
        if (isModifier && e.key.toLowerCase() === 's') {
            e.preventDefault();
            this.onSave(e.shiftKey);
            return true;
        }

        // Find & Replace: Ctrl+F
        if (isModifier && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if (this.onFindReplace) this.onFindReplace();
            return true;
        }

        // Bold: Ctrl+B
        if (isModifier && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            applyInlineStyle('bold');
            this.pushUndoState();
            return true;
        }

        // Italic: Ctrl+I
        if (isModifier && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            applyInlineStyle('italic');
            this.pushUndoState();
            return true;
        }

        // Underline: Ctrl+U
        if (isModifier && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            applyInlineStyle('underline');
            this.pushUndoState();
            return true;
        }

        // Open: Ctrl+O
        if (isModifier && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            this.onOpen();
            return true;
        }

        // Undo / Redo: Ctrl+Z / Ctrl+Y
        if (isModifier && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                this.redo();
            } else {
                this.undo();
            }
            return true;
        }

        if (isModifier && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.redo();
            return true;
        }

        // Zen / Focus Mode: Ctrl+Shift+F
        if (isModifier && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if (this.onZenMode) this.onZenMode();
            return true;
        }

        // Typewriter Scrolling: Ctrl+Shift+T
        if (isModifier && e.shiftKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            if (this.onTypewriter) this.onTypewriter();
            return true;
        }

        // Scene Numbers: Ctrl+Shift+N
        if (isModifier && e.shiftKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            if (this.onSceneNumbers) this.onSceneNumbers();
            return true;
        }

        // Dual Dialogue: Ctrl+Shift+D
        if (isModifier && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            if (this.onDualDialogue) this.onDualDialogue();
            return true;
        }

        // Export PDF: Ctrl+Shift+P
        if (isModifier && e.shiftKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (this.onExportPDF) this.onExportPDF();
            return true;
        }

        // Command Palette: Ctrl+K
        if (isModifier && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (this.onCommandPalette) this.onCommandPalette();
            return true;
        }

        // Formatting Shortcuts: Ctrl+1 through Ctrl+7
        if (isModifier && FORMAT_HOTKEYS[e.key]) {
            e.preventDefault();
            const format = FORMAT_HOTKEYS[e.key];
            const block = getCurrentBlock(this.editor);
            if (block) {
                changeBlockFormat(block, format);
                this.onFormatChanged(format);
                this.pushUndoState();
            }
            return true;
        }

        return false;
    }
}
