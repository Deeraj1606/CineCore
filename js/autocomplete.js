/**
 * autocomplete.js - Instant, Context-Aware Screenplay Suggestion Overlay
 * Operates with 0ms keystroke filtering, match highlighting, flicker-free DOM pooling,
 * and element-specific activation (Characters, Locations, Transitions, Times of Day).
 */

import { createBlock, setCaretToEnd, setCaretPosition, insertScriptTag } from './editor.js';

export class Autocomplete {
    constructor(suggestionsBox, entityDictionary, options = {}) {
        this.box = suggestionsBox;
        this.entities = entityDictionary;
        this.onApply = options.onApply || (() => {});

        this.isActive = false;
        this.items = [];
        this.activeIndex = 0;
        this.currentBlock = null;
        this.activeContext = null; // 'character' | 'location' | 'transition' | 'timeOfDay' | 'scenePrefix'
        this.inlineTriggerLength = 0;

        // Pre-create a DOM item pool of 40 reusable <li> elements to prevent DOM thrashing
        this.itemPool = [];
        this.initDOMPool();
    }

    initDOMPool() {
        this.box.innerHTML = '';
        for (let i = 0; i < 40; i++) {
            const li = document.createElement('li');
            li.className = 'sug-item hidden';
            li.innerHTML = '<span class="sug-label"></span><span class="sug-badge"></span>';

            li.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Never steal focus from editor
                this.applyIndex(i);
            });

            this.box.appendChild(li);
            this.itemPool.push(li);
        }
    }

    /**
     * Instant check triggered on every keystroke
     */
    check(block) {
        if (!block) {
            this.hide();
            return;
        }

        const type = block.getAttribute('data-type');
        const rawText = (block.innerText || block.textContent || '').replace(/\r?\n/g, '');
        const upper = rawText.toUpperCase();

        let contextType = null;
        let queryText = '';
        let isInline = false;

        // Check for inline trigger: @ (character), # (location), ! (prop) in action or dialogue
        const inlineMatch = rawText.match(/([@#!])([A-Za-z0-9_]*)$/);
        if (inlineMatch && (type === 'action' || type === 'dialogue')) {
            const trigger = inlineMatch[1];
            const q = inlineMatch[2].toUpperCase();
            isInline = true;
            this.inlineTriggerLength = inlineMatch[0].length;
            if (trigger === '@') {
                contextType = 'character';
                queryText = q;
            } else if (trigger === '#') {
                contextType = 'location';
                queryText = q;
            } else if (trigger === '!') {
                contextType = 'prop';
                queryText = q;
            }
        } else if (type === 'character') {
            contextType = 'character';
            queryText = upper.trim();
        } else if (type === 'transition') {
            contextType = 'transition';
            queryText = upper.trim();
        } else if (type === 'scene-heading') {
            // Determine position inside scene heading:
            // 1. Prefix: if line starts without a period and <= 4 chars
            const prefixMatch = upper.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*(.*)$/);

            if (!prefixMatch) {
                // User is typing prefix (e.g. "I", "IN", "E", "EX")
                contextType = 'scenePrefix';
                queryText = upper.trim();
            } else {
                const rest = prefixMatch[2]; // after "INT. "
                if (rest.includes(' - ') || rest.includes('-')) {
                    // User is typing time of day after hyphen
                    contextType = 'timeOfDay';
                    queryText = rest.split('-').pop().trim();
                } else {
                    // User is typing location
                    contextType = 'location';
                    queryText = rest.trim();
                }
            }
        } else {
            this.hide();
            return;
        }

        this.isInlineTag = isInline;
        this.activeContext = contextType;

        // Query the learned entity dictionary
        const results = this.entities.query(contextType, queryText, 40);

        if (results.length === 0) {
            this.hide();
            return;
        }

        this.render(results, block, queryText);
    }

    /**
     * Render suggestions with match highlighting without destroying DOM elements
     */
    render(results, block, queryText) {
        this.items = results;
        this.activeIndex = 0;
        this.currentBlock = block;
        this.isActive = true;

        const badgeMap = {
            'character': 'CHAR',
            'location': 'LOC',
            'transition': 'TRANS',
            'timeOfDay': 'TIME',
            'scenePrefix': 'SLUG',
            'prop': 'PROP'
        };

        const badgeLabel = badgeMap[this.activeContext] || 'ENTITY';

        // Update reusable DOM items in pool
        for (let i = 0; i < this.itemPool.length; i++) {
            const li = this.itemPool[i];

            if (i < results.length) {
                const item = results[i];
                const labelSpan = li.querySelector('.sug-label');
                const badgeSpan = li.querySelector('.sug-badge');

                // Build match highlighted HTML
                labelSpan.innerHTML = this.highlightMatches(item.label, item.matchRanges, queryText);
                badgeSpan.textContent = badgeLabel;

                li.classList.remove('hidden');
                if (i === 0) {
                    li.classList.add('active');
                } else {
                    li.classList.remove('active');
                }
            } else {
                li.classList.add('hidden');
                li.classList.remove('active');
            }
        }

        this.box.classList.remove('hidden');
        this.positionPopup(block);
    }

    /**
     * Highlights matched characters with <span class="match-highlight">
     */
    highlightMatches(label, matchRanges, query) {
        if (matchRanges && matchRanges.length > 0) {
            let html = '';
            let lastIdx = 0;
            for (const [start, end] of matchRanges) {
                if (start > lastIdx) {
                    html += escapeHTML(label.slice(lastIdx, start));
                }
                html += `<span class="match-highlight">${escapeHTML(label.slice(start, end))}</span>`;
                lastIdx = end;
            }
            if (lastIdx < label.length) {
                html += escapeHTML(label.slice(lastIdx));
            }
            return html;
        }

        if (!query || query.length === 0) return escapeHTML(label);

        const labelUpper = label.toUpperCase();
        const queryUpper = query.toUpperCase();
        const idx = labelUpper.indexOf(queryUpper);

        if (idx === -1) return escapeHTML(label);

        const before = escapeHTML(label.slice(0, idx));
        const matched = escapeHTML(label.slice(idx, idx + query.length));
        const after = escapeHTML(label.slice(idx + query.length));

        return `${before}<span class="match-highlight">${matched}</span>${after}`;
    }

    /**
     * Position popup exactly at the caret, moving with it as the user types.
     */
    positionPopup(block) {
        let rect = block.getBoundingClientRect();
        
        // Attempt to get caret coordinates
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rangeRect = range.getBoundingClientRect();
            // Fallback to block rect if caret rect is invisible (e.g. empty text node)
            if (rangeRect.width > 0 || rangeRect.height > 0) {
                rect = rangeRect;
            } else {
                // If empty block, we can get the bounding rect of a temporary span
                const tempSpan = document.createElement('span');
                tempSpan.innerHTML = '&#8203;'; // zero-width space
                range.insertNode(tempSpan);
                rect = tempSpan.getBoundingClientRect();
                tempSpan.parentNode.removeChild(tempSpan);
            }
        }

        const boxHeight = Math.min(240, (this.items.length * 36) + 12);
        const boxWidth = 260;

        let top = rect.bottom + 4;
        let left = rect.left;

        // Vertical collision: if popup overflows viewport bottom, display above line
        const viewportBottom = window.innerHeight;
        if (top + boxHeight > viewportBottom) {
            top = rect.top - boxHeight - 4;
            // Prevent going off top of screen
            if (top < 0) top = 10;
        }

        // Horizontal collision: if popup overflows right edge, clamp
        const viewportRight = window.innerWidth;
        if (left + boxWidth > viewportRight - 16) {
            left = viewportRight - boxWidth - 16;
            if (left < 0) left = 10;
        }

        this.box.style.position = 'fixed'; // Ensure it is always fixed!
        this.box.style.top = `${top}px`;
        this.box.style.left = `${left}px`;
    }

    hide() {
        if (!this.isActive) return;
        this.box.classList.add('hidden');
        this.isActive = false;
        this.items = [];
        this.activeIndex = 0;
        this.currentBlock = null;
        this.activeContext = null;
        this.inlineTriggerLength = 0;
    }

    /**
     * Intercepts keyboard navigation keys when autocomplete dropdown is active.
     * Returns true if event was consumed.
     */
    handleKeyDown(e) {
        if (!this.isActive) return false;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            this.navigate('down');
            return true;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            this.navigate('up');
            return true;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            this.apply();
            return true;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.hide();
            return true;
        }
        return false;
    }

    navigate(direction) {
        if (!this.isActive || this.items.length === 0) return;

        this.itemPool[this.activeIndex].classList.remove('active');

        if (direction === 'down') {
            this.activeIndex = (this.activeIndex + 1) % this.items.length;
        } else {
            this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
        }

        const activeLi = this.itemPool[this.activeIndex];
        activeLi.classList.add('active');
        activeLi.scrollIntoView({ block: 'nearest' });
    }

    applyIndex(index) {
        if (index >= 0 && index < this.items.length) {
            this.activeIndex = index;
            this.apply();
        }
    }

    /**
     * Apply selected entity suggestion to the screenplay
     */
    apply() {
        if (!this.isActive || !this.currentBlock || !this.items[this.activeIndex]) return;

        const target = this.items[this.activeIndex];
        const block = this.currentBlock;
        const entity = target.entity;
        const context = this.activeContext;

        // Learn / increment usage
        this.entities.learn(context === 'scenePrefix' ? 'scenePrefix' : context, entity.name);

        if (this.isInlineTag) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const startNode = range.startContainer;
                const startOffset = range.startOffset;
                const triggerLen = this.inlineTriggerLength || 0;
                if (startNode.nodeType === Node.TEXT_NODE && startOffset >= triggerLen && triggerLen > 0) {
                    range.setStart(startNode, startOffset - triggerLen);
                    range.deleteContents();
                } else {
                    const raw = block.textContent;
                    block.textContent = raw.replace(/([@#!])([A-Za-z0-9_]*)$/, '');
                    setCaretToEnd(block);
                }
            } else {
                const raw = block.textContent;
                block.textContent = raw.replace(/([@#!])([A-Za-z0-9_]*)$/, '');
                setCaretToEnd(block);
            }
            this.hide();
            insertScriptTag(context === 'prop' ? 'prop' : context, entity.name);
            this.onApply({
                block,
                newFormat: block.getAttribute('data-type'),
                entityType: context,
                name: entity.name
            });
            return;
        }

        if (context === 'character') {
            block.textContent = entity.name;
            this.hide();

            // Auto-advance to Dialogue
            const dialogueBlock = createBlock('dialogue', '');
            block.after(dialogueBlock);
            setCaretToEnd(dialogueBlock);

            this.onApply({
                block: dialogueBlock,
                newFormat: 'dialogue',
                entityType: 'character',
                name: entity.name
            });
        } else if (context === 'location') {
            const raw = block.textContent;
            const match = raw.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i);
            const prefix = match ? match[1].toUpperCase() : 'INT.';

            block.textContent = `${prefix} ${entity.name} - `;
            this.hide();
            setCaretToEnd(block);

            this.onApply({
                block,
                newFormat: 'scene-heading',
                entityType: 'location',
                name: entity.name
            });
        } else if (context === 'timeOfDay') {
            const raw = block.textContent;
            const parts = raw.split('-');
            const base = parts[0].trim();

            block.textContent = `${base} - ${entity.name}`;
            this.hide();
            setCaretToEnd(block);

            this.onApply({
                block,
                newFormat: 'scene-heading',
                entityType: 'timeOfDay',
                name: entity.name
            });
        } else if (context === 'scenePrefix') {
            block.textContent = entity.name;
            this.hide();
            setCaretToEnd(block);

            this.onApply({
                block,
                newFormat: 'scene-heading',
                entityType: 'scenePrefix',
                name: entity.name
            });
        } else if (context === 'transition') {
            block.textContent = entity.name;
            this.hide();
            setCaretToEnd(block);

            this.onApply({
                block,
                newFormat: 'transition',
                entityType: 'transition',
                name: entity.name
            });
        }
    }
}

function escapeHTML(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
