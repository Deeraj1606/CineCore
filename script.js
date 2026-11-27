/**
 * script.js - Standalone Bundle & Fallback for Cinecore Screenplay Writer
 * Includes Learned Screenplay Entity Memory, instant 0ms keystroke filtering,
 * match highlighting, IndexedDB / LocalStorage, and File System API.
 */

(function () {
    // --- Learned Entity Memory Class ---
    class EntityDictionary {
        constructor() {
            this.characters = new Map();
            this.locations = new Map();
            this.transitions = new Map();
            this.timeOfDay = new Map();
            this.scenePrefixes = new Map();

            this.initDefaults();
        }

        initDefaults() {
            ['INT. ', 'EXT. ', 'INT/EXT. ', 'I/E. ', 'EST. '].forEach((p, idx) => {
                this.scenePrefixes.set(p.toUpperCase().trim(), {
                    name: p,
                    usageCount: 100 - idx,
                    lastUsed: Date.now() - (idx * 1000)
                });
            });

            ['DAY', 'NIGHT', 'CONTINUOUS', 'LATER', 'EVENING', 'MORNING', 'DAWN', 'DUSK', 'MOMENTS LATER', 'SAME TIME', 'FLASHBACK'].forEach((t, idx) => {
                this.timeOfDay.set(t.toUpperCase().trim(), {
                    name: t,
                    usageCount: 50 - idx,
                    lastUsed: Date.now() - (idx * 1000)
                });
            });

            ['CUT TO:', 'FADE IN:', 'FADE OUT.', 'DISSOLVE TO:', 'MATCH CUT TO:', 'JUMP CUT TO:', 'SMASH CUT TO:', 'TIME CUT:', 'BACK TO:', 'IRIS OUT.'].forEach((t, idx) => {
                this.transitions.set(t.toUpperCase().trim(), {
                    name: t,
                    usageCount: 50 - idx,
                    lastUsed: Date.now() - (idx * 1000)
                });
            });
        }

        getCollection(type) {
            switch (type) {
                case 'character': return this.characters;
                case 'location': return this.locations;
                case 'transition': return this.transitions;
                case 'timeOfDay': return this.timeOfDay;
                case 'scenePrefix':
                case 'scene-heading': return this.scenePrefixes;
                default: return null;
            }
        }

        learn(type, rawName) {
            if (!rawName) return null;
            let clean = rawName.trim();
            if (type === 'character') clean = clean.replace(/\(.*\)/g, '').trim().toUpperCase();
            else clean = clean.toUpperCase();
            if (clean.length < 1) return null;

            const collection = this.getCollection(type);
            if (!collection) return null;

            const key = clean.toUpperCase();
            const existing = collection.get(key);
            if (existing) {
                existing.usageCount++;
                existing.lastUsed = Date.now();
                return existing;
            }

            const item = {
                name: clean,
                usageCount: 1,
                lastUsed: Date.now()
            };
            collection.set(key, item);
            return item;
        }

        query(type, rawQuery, maxResults = 6) {
            const collection = this.getCollection(type);
            if (!collection) return [];

            const query = (rawQuery || '').trim().toUpperCase();
            if (query.length === 0) {
                return Array.from(collection.values())
                    .sort((a, b) => (b.usageCount * 1e12 + b.lastUsed) - (a.usageCount * 1e12 + a.lastUsed))
                    .slice(0, maxResults)
                    .map(e => ({ entity: e, label: e.name, matchRanges: [] }));
            }

            const matches = [];

            for (const entity of collection.values()) {
                const nameUpper = entity.name.toUpperCase();
                if (nameUpper === query) continue;

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

                // 2. Word Boundary Match
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

                // For single-char query, suppress internal letters
                if (query.length === 1) continue;

                // 3. Subsequence / Acronym match starting from first letter
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
                        const merged = [];
                        for (const r of ranges) {
                            if (merged.length > 0 && merged[merged.length - 1][1] === r[0]) {
                                merged[merged.length - 1][1] = r[1];
                            } else {
                                merged.push([r[0], r[1]]);
                            }
                        }
                        const span = ranges[ranges.length - 1][1] - ranges[0][0];
                        matches.push({
                            entity,
                            label: entity.name,
                            matchRanges: merged,
                            score: 900 - span + (entity.usageCount * 5) + (entity.lastUsed / 1e12)
                        });
                        continue;
                    }
                }

                // 4. Substring Match
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

            matches.sort((a, b) => b.score - a.score);
            return matches.slice(0, maxResults);
        }

        serialize() {
            return {
                characters: Array.from(this.characters.values()),
                locations: Array.from(this.locations.values()),
                transitions: Array.from(this.transitions.values()),
                timeOfDay: Array.from(this.timeOfDay.values())
            };
        }

        deserialize(data) {
            if (!data) return;
            ['characters', 'locations', 'transitions', 'timeOfDay'].forEach(key => {
                if (Array.isArray(data[key])) {
                    const col = this.getCollection(key.replace(/s$/, ''));
                    if (col) {
                        data[key].forEach(item => {
                            if (item && item.name) {
                                col.set(item.name.toUpperCase(), {
                                    name: item.name,
                                    usageCount: item.usageCount || 1,
                                    lastUsed: item.lastUsed || Date.now()
                                });
                            }
                        });
                    }
                }
            });
        }

        seedFromDOM(editor) {
            if (!editor) return;
            editor.querySelectorAll('.script-block.character').forEach(b => {
                const raw = (b.innerText || '').trim();
                if (raw) this.learn('character', raw);
            });
            editor.querySelectorAll('.script-block.scene-heading').forEach(b => {
                const raw = (b.innerText || '').trim().toUpperCase();
                const match = raw.match(/(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s+(.*?)\s+-\s*(.*)/);
                if (match) {
                    if (match[1]) this.learn('location', match[1].trim());
                    if (match[2]) this.learn('timeOfDay', match[2].trim());
                }
            });
            editor.querySelectorAll('.script-block.transition').forEach(b => {
                const raw = (b.innerText || '').trim().toUpperCase();
                if (raw) this.learn('transition', raw);
            });
        }
    }

    function initStandalone() {
        if (window.__CINECORE_INITIALIZED__) return;
        window.__CINECORE_INITIALIZED__ = true;

        console.log('🎬 Cinecore Standalone Engine initializing with Learned Entity Memory...');

        const entityDictionary = new EntityDictionary();

        const editor = document.getElementById('editor');
        const pageShadow = document.getElementById('page-shadow');
        const scriptView = document.getElementById('script-view');
        const titleView = document.getElementById('title-view');
        const suggestionsBox = document.getElementById('suggestions-box');
        const saveIndicator = document.getElementById('save-indicator');

        // Toolbar buttons
        const toggleFocusBtn = document.getElementById('toggle-focus-btn');
        const toggleTitleBtn = document.getElementById('toggle-title-btn');
        const toggleSceneBtn = document.getElementById('toggle-scene-btn');
        const themeSelect = document.getElementById('theme-select');
        const versionHistoryBtn = document.getElementById('version-history-btn');
        const sampleScriptBtn = document.getElementById('sample-script-btn');
        const clearBtn = document.getElementById('clear-btn');

        // File Action Buttons
        const openFileBtn = document.getElementById('open-file-btn');
        const saveFileBtn = document.getElementById('save-file-btn');
        const exportMenuBtn = document.getElementById('export-menu-btn');
        const exportDropdown = document.getElementById('export-dropdown');
        const exportPdfBtn = document.getElementById('export-pdf-btn');
        const exportFountainBtn = document.getElementById('export-fountain-btn');
        const exportTxtBtn = document.getElementById('export-txt-btn');

        // Format buttons
        const formatButtons = document.querySelectorAll('.fmt-btn');

        // Title page inputs
        const tpTitle = document.getElementById('tp-title');
        const tpAuthor = document.getElementById('tp-author');
        const tpSource = document.getElementById('tp-source');
        const tpContact = document.getElementById('tp-contact');

        // Version History Modal Elements
        const versionModal = document.getElementById('version-modal');
        const closeVersionModalBtn = document.getElementById('close-version-modal-btn');
        const versionList = document.getElementById('version-list');
        const createSnapshotBtn = document.getElementById('create-snapshot-btn');

        // Stats elements
        const statWords = document.getElementById('stat-words');
        const statScenes = document.getElementById('stat-scenes');
        const statPages = document.getElementById('stat-pages');
        const statTime = document.getElementById('stat-time');

        // State
        let showSceneNumbers = false;
        let autosaveTimer = null;
        let history = [];
        let historyIndex = -1;
        let isUndoRedoAction = false;

        // Autocomplete State & DOM Pool
        let suggestionsActive = false;
        let currentSuggestions = [];
        let activeSuggestionIndex = 0;
        let currentSuggestionBlock = null;
        let activeContextType = null;
        const itemPool = [];

        const ELEMENT_TYPES = [
            'scene-heading',
            'action',
            'character',
            'parenthetical',
            'dialogue',
            'transition',
            'shot'
        ];

        const THEMES = [
            { id: 'midnight', name: 'Midnight Slate (Default)' },
            { id: 'dark-cine', name: 'Dark Cine (Dark Paper)' },
            { id: 'hollywood', name: 'Classic Hollywood (Light)' },
            { id: 'noir', name: 'Studio Noir (High Contrast)' }
        ];

        const SAMPLE_SCRIPT_HTML = `
<div class="script-block scene-heading" data-type="scene-heading">EXT. NEO-TOKYO ROOFTOP - NIGHT</div>
<div class="script-block action" data-type="action">Rain slices through the harsh halogen glow. Steam billows from ventilation shafts into the smog-choked skyline.</div>
<div class="script-block action" data-type="action">KAI (30s), in a drenched trench coat, crouches at the ledge. He checks the glowing chronometer on his gauntlet.</div>
<div class="script-block character" data-type="character">KAI</div>
<div class="script-block parenthetical" data-type="parenthetical">(whispering into comms)</div>
<div class="script-block dialogue" data-type="dialogue">Target is inside the vault. We have less than sixty seconds before grid lockdown.</div>
<div class="script-block character" data-type="character">VALERIE (V.O.)</div>
<div class="script-block dialogue" data-type="dialogue">Breaching charge is primed. Don't look back.</div>
<div class="script-block action" data-type="action">Kai pulls his visor down. He leaps into the abyss.</div>
<div class="script-block transition" data-type="transition">CUT TO:</div>
<div class="script-block scene-heading" data-type="scene-heading">INT. MAINFRAME VAULT - CONTINUOUS</div>
<div class="script-block action" data-type="action">Rows of quantum towers hum in the darkness. An emergency siren begins to WAIL.</div>
        `.trim();

        // 1. Theme Management
        function applyTheme(themeId) {
            const found = THEMES.find(t => t.id === themeId);
            const activeId = found ? found.id : 'midnight';
            document.body.setAttribute('data-theme', activeId);
            localStorage.setItem('cinecore-theme', activeId);
            if (themeSelect) themeSelect.value = activeId;
        }

        if (themeSelect) {
            themeSelect.innerHTML = '';
            THEMES.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                themeSelect.appendChild(opt);
            });
            const savedTheme = localStorage.getItem('cinecore-theme') || 'midnight';
            applyTheme(savedTheme);
            themeSelect.addEventListener('change', (e) => {
                applyTheme(e.target.value);
                triggerAutosave();
            });
        }

        // 2. DOM Sanitizer & Block Helpers
        function sanitizeDOM() {
            if (!editor) return;

            const childNodes = Array.from(editor.childNodes);
            childNodes.forEach(node => {
                if (node.nodeType === 3) {
                    if (node.textContent.trim().length > 0) {
                        const block = createBlock('action', node.textContent);
                        editor.replaceChild(block, node);
                    } else {
                        node.remove();
                    }
                } else if (node.nodeType === 1 && !node.classList.contains('script-block')) {
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
                if (!b.classList.contains(type)) b.classList.add(type);
                if (b.textContent.trim() === '' && !b.querySelector('br')) {
                    b.innerHTML = '<br>';
                }
            });

            return blocks[0];
        }

        function createBlock(format = 'action', text = '') {
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

        function getCurrentBlock() {
            if (!editor) return null;
            const sel = window.getSelection();
            if (!sel || !sel.anchorNode) {
                return editor.querySelector('.script-block') || sanitizeDOM();
            }

            let node = sel.anchorNode;
            if (node.nodeType === 3) node = node.parentNode;

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

            return editor.querySelector('.script-block') || sanitizeDOM();
        }

        function getCaretOffset(element) {
            let offset = 0;
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const preRange = range.cloneRange();
                preRange.selectNodeContents(element);
                preRange.setEnd(range.endContainer, range.endOffset);
                offset = preRange.toString().length;
            }
            return offset;
        }

        function setCaretPosition(element, offset = 0) {
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
                if (node.nodeType === 3) {
                    const next = charCount + node.length;
                    if (!found && (offset <= next || offset === -1)) {
                        const target = (offset === -1 || offset > next) ? node.length : (offset - charCount);
                        range.setStart(node, Math.max(0, Math.min(node.length, target)));
                        range.collapse(true);
                        found = true;
                        return;
                    }
                    charCount = next;
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

        function setCaretToEnd(element) {
            setCaretPosition(element, -1);
        }

        function changeBlockFormat(block, newFormat) {
            if (!block || !ELEMENT_TYPES.includes(newFormat)) return;
            ELEMENT_TYPES.forEach(t => block.classList.remove(t));
            block.classList.add(newFormat);
            block.setAttribute('data-type', newFormat);

            let text = (block.innerText || block.textContent || '').replace(/\r?\n/g, '').trim();
            if (newFormat === 'parenthetical') {
                text = text.replace(/^\(+|\)+$/g, '').trim();
                block.textContent = text ? `(${text})` : '()';
            } else if (['character', 'scene-heading', 'transition', 'shot'].includes(newFormat)) {
                if (text) block.textContent = text.toUpperCase();
            }
            if (block.textContent.trim() === '') {
                block.innerHTML = '<br>';
            }
        }

        function updateFormatPills(activeFormat) {
            formatButtons.forEach(btn => {
                if (btn.getAttribute('data-fmt') === activeFormat) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            document.querySelectorAll('.script-block.is-active-block').forEach(b => b.classList.remove('is-active-block'));
            const current = getCurrentBlock();
            if (current) current.classList.add('is-active-block');
        }

        // 3. Smart Keystroke Transitions
        const NEXT_MAP = {
            'scene-heading': 'action',
            'action': 'action',
            'character': 'dialogue',
            'parenthetical': 'dialogue',
            'dialogue': 'character',
            'transition': 'scene-heading',
            'shot': 'action'
        };

        const TAB_CYCLE = {
            'action': 'character',
            'character': 'parenthetical',
            'parenthetical': 'dialogue',
            'dialogue': 'transition',
            'transition': 'scene-heading',
            'scene-heading': 'action',
            'shot': 'action'
        };

        const REVERSE_TAB = {
            'character': 'action',
            'parenthetical': 'character',
            'dialogue': 'parenthetical',
            'transition': 'dialogue',
            'scene-heading': 'transition',
            'action': 'scene-heading',
            'shot': 'scene-heading'
        };

        function handleEnter(block) {
            if (!block) return;
            const currentFormat = block.getAttribute('data-type') || 'action';
            const raw = (block.innerText || block.textContent || '').replace(/\r?\n/g, '');
            const trimmed = raw.trim();
            const caret = getCaretOffset(block);

            // Entities are no longer auto-learned on Enter in CINECORE 2.0

            if (trimmed === '') {
                if (currentFormat === 'character' || currentFormat === 'dialogue') {
                    changeBlockFormat(block, 'action');
                    setCaretToEnd(block);
                    updateFormatPills('action');
                } else if (currentFormat === 'parenthetical') {
                    changeBlockFormat(block, 'dialogue');
                    setCaretToEnd(block);
                    updateFormatPills('dialogue');
                } else if (currentFormat === 'transition') {
                    changeBlockFormat(block, 'scene-heading');
                    setCaretToEnd(block);
                    updateFormatPills('scene-heading');
                } else {
                    const newBlock = createBlock('action', '');
                    block.after(newBlock);
                    setCaretToEnd(newBlock);
                    updateFormatPills('action');
                    checkSuggestions(newBlock);
                }
            } else {
                const textBefore = raw.slice(0, caret);
                const textAfter = raw.slice(caret);
                const nextFormat = NEXT_MAP[currentFormat] || 'action';

                if (textBefore.trim() === '') block.innerHTML = '<br>';
                else block.textContent = textBefore;

                const newBlock = createBlock(nextFormat, textAfter);
                block.after(newBlock);

                if (nextFormat === 'parenthetical' && newBlock.textContent === '()') {
                    setCaretPosition(newBlock, 1);
                } else {
                    setCaretPosition(newBlock, 0);
                }
                updateFormatPills(nextFormat);
                checkSuggestions(newBlock);
            }

            pushUndoState();
            updatePagination();
            updateStats();
            triggerAutosave();
        }

        function handleTab(block, isShift) {
            if (!block) return;
            const cur = block.getAttribute('data-type') || 'action';
            const next = isShift ? REVERSE_TAB[cur] : TAB_CYCLE[cur];
            changeBlockFormat(block, next);
            setCaretToEnd(block);
            updateFormatPills(next);
            // Immediately activate suggestions for new format
            checkSuggestions(block);
            pushUndoState();
            updatePagination();
            triggerAutosave();
        }

        function handleBackspace(block) {
            if (!block) return;
            const sel = window.getSelection();
            if (!sel || !sel.isCollapsed) return;

            const caret = getCaretOffset(block);
            if (caret !== 0) return;

            const prev = block.previousElementSibling;
            if (!prev || !prev.classList.contains('script-block')) {
                const text = (block.innerText || block.textContent || '').trim();
                if (text === '' && block.getAttribute('data-type') !== 'scene-heading') {
                    changeBlockFormat(block, 'scene-heading');
                    updateFormatPills('scene-heading');
                }
                return;
            }

            const curText = (block.innerText || block.textContent || '').replace(/\r?\n/g, '');
            if (curText.trim() === '') {
                block.remove();
                setCaretToEnd(prev);
            } else {
                const prevText = (prev.innerText || prev.textContent || '').replace(/\r?\n/g, '');
                const mergePos = prevText.length;
                if (prev.innerHTML === '<br>') prev.textContent = curText;
                else prev.textContent = prevText + curText;
                block.remove();
                setCaretPosition(prev, mergePos);
            }

            const current = getCurrentBlock();
            updateFormatPills(current ? current.getAttribute('data-type') : 'action');
            pushUndoState();
            updatePagination();
            updateStats();
            triggerAutosave();
        }

        function checkAutoRecognition(block) {
            if (!block) return;
            const raw = (block.innerText || block.textContent || '').trim();
            const upper = raw.toUpperCase();
            const type = block.getAttribute('data-type');

            if (type !== 'scene-heading' &&
                (upper.startsWith('INT.') || upper.startsWith('EXT.') ||
                 upper.startsWith('INT/EXT.') || upper.startsWith('I/E.') ||
                 upper.startsWith('EST.'))) {
                changeBlockFormat(block, 'scene-heading');
                updateFormatPills('scene-heading');
            } else if ((type === 'dialogue' || type === 'action') && raw.startsWith('(')) {
                changeBlockFormat(block, 'parenthetical');
                updateFormatPills('parenthetical');
            } else if (type !== 'transition' &&
                (upper.endsWith('TO:') || upper === 'FADE IN:' || upper === 'FADE OUT.')) {
                changeBlockFormat(block, 'transition');
                updateFormatPills('transition');
            }
        }

        // 4. Autocomplete DOM Pool & Instant Keystroke Filtering
        function initDOMPool() {
            if (!suggestionsBox) return;
            suggestionsBox.innerHTML = '';
            for (let i = 0; i < 40; i++) {
                const li = document.createElement('li');
                li.className = 'sug-item hidden';
                li.innerHTML = '<span class="sug-label"></span><span class="sug-badge"></span>';
                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    applySuggestionIndex(i);
                });
                suggestionsBox.appendChild(li);
                itemPool.push(li);
            }
        }
        initDOMPool();

        function checkSuggestions(block) {
            if (!block || !suggestionsBox) return;
            const type = block.getAttribute('data-type');

            if (type !== 'character' && type !== 'scene-heading' && type !== 'transition') {
                hideSuggestions();
                return;
            }

            const rawText = (block.innerText || block.textContent || '').replace(/\r?\n/g, '');
            const upper = rawText.toUpperCase();

            let contextType = null;
            let query = '';

            if (type === 'character') {
                contextType = 'character';
                query = upper.trim();
            } else if (type === 'transition') {
                contextType = 'transition';
                query = upper.trim();
            } else if (type === 'scene-heading') {
                const prefixMatch = upper.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*(.*)$/);
                if (!prefixMatch) {
                    contextType = 'scenePrefix';
                    query = upper.trim();
                } else {
                    const rest = prefixMatch[2];
                    if (rest.includes(' - ') || rest.includes('-')) {
                        contextType = 'timeOfDay';
                        query = rest.split('-').pop().trim();
                    } else {
                        contextType = 'location';
                        query = rest.trim();
                    }
                }
            }

            activeContextType = contextType;
            const results = entityDictionary.query(contextType, query, 40);

            if (results.length === 0) {
                hideSuggestions();
                return;
            }

            renderSuggestions(results, block, query);
        }

        function highlightMatch(label, matchRanges, query) {
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
            const lUp = label.toUpperCase();
            const qUp = query.toUpperCase();
            const idx = lUp.indexOf(qUp);
            if (idx === -1) return escapeHTML(label);
            return `${escapeHTML(label.slice(0, idx))}<span class="match-highlight">${escapeHTML(label.slice(idx, idx + query.length))}</span>${escapeHTML(label.slice(idx + query.length))}`;
        }

        function renderSuggestions(results, block, query) {
            currentSuggestions = results;
            activeSuggestionIndex = 0;
            currentSuggestionBlock = block;
            suggestionsActive = true;

            const badgeMap = {
                'character': 'CHAR',
                'location': 'LOC',
                'transition': 'TRANS',
                'timeOfDay': 'TIME',
                'scenePrefix': 'SLUG'
            };
            const badge = badgeMap[activeContextType] || 'ENTITY';

            for (let i = 0; i < itemPool.length; i++) {
                const li = itemPool[i];
                if (i < results.length) {
                    const item = results[i];
                    li.querySelector('.sug-label').innerHTML = highlightMatch(item.label, item.matchRanges, query);
                    li.querySelector('.sug-badge').textContent = badge;
                    li.classList.remove('hidden');
                    if (i === 0) li.classList.add('active');
                    else li.classList.remove('active');
                } else {
                    li.classList.add('hidden');
                    li.classList.remove('active');
                }
            }

            suggestionsBox.classList.remove('hidden');

            // Screen edge collision positioning based on caret
            let rect = block.getBoundingClientRect();
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rangeRect = range.getBoundingClientRect();
                if (rangeRect.width > 0 || rangeRect.height > 0) {
                    rect = rangeRect;
                } else {
                    const tempSpan = document.createElement('span');
                    tempSpan.innerHTML = '&#8203;';
                    range.insertNode(tempSpan);
                    rect = tempSpan.getBoundingClientRect();
                    tempSpan.parentNode.removeChild(tempSpan);
                }
            }

            const boxHeight = Math.min(220, (results.length * 36) + 12);
            const boxWidth = 260;

            let top = rect.bottom + window.scrollY + 4;
            let left = rect.left + window.scrollX;

            if (top + boxHeight > window.innerHeight + window.scrollY) {
                top = Math.max(10, rect.top + window.scrollY - boxHeight - 4);
            }
            if (left + boxWidth > window.innerWidth + window.scrollX - 16) {
                left = Math.max(16, window.innerWidth + window.scrollX - boxWidth - 16);
            }

            suggestionsBox.style.top = `${top}px`;
            suggestionsBox.style.left = `${left}px`;
        }

        function hideSuggestions() {
            if (!suggestionsBox || !suggestionsActive) return;
            suggestionsBox.classList.add('hidden');
            suggestionsActive = false;
            currentSuggestions = [];
            currentSuggestionBlock = null;
        }

        function applySuggestionIndex(idx) {
            if (idx >= 0 && idx < currentSuggestions.length) {
                activeSuggestionIndex = idx;
                applySuggestion();
            }
        }

        function applySuggestion() {
            if (!suggestionsActive || !currentSuggestionBlock || !currentSuggestions[activeSuggestionIndex]) return;

            const target = currentSuggestions[activeSuggestionIndex];
            const block = currentSuggestionBlock;
            const context = activeContextType;
            const entity = target.entity;

            entityDictionary.learn(context === 'scenePrefix' ? 'scenePrefix' : context, entity.name);

            if (context === 'character') {
                block.textContent = entity.name;
                hideSuggestions();
                const d = createBlock('dialogue', '');
                block.after(d);
                setCaretToEnd(d);
                updateFormatPills('dialogue');
            } else if (context === 'location') {
                const match = block.textContent.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i);
                const prefix = match ? match[1].toUpperCase() : 'INT.';
                block.textContent = `${prefix} ${entity.name} - `;
                hideSuggestions();
                setCaretToEnd(block);
                updateFormatPills('scene-heading');
            } else if (context === 'timeOfDay') {
                const base = block.textContent.split('-')[0].trim();
                block.textContent = `${base} - ${entity.name}`;
                hideSuggestions();
                setCaretToEnd(block);
                updateFormatPills('scene-heading');
            } else if (context === 'scenePrefix') {
                block.textContent = entity.name;
                hideSuggestions();
                setCaretToEnd(block);
                updateFormatPills('scene-heading');
            } else if (context === 'transition') {
                block.textContent = entity.name;
                hideSuggestions();
                setCaretToEnd(block);
                updateFormatPills('transition');
            }

            pushUndoState();
            updatePagination();
            updateStats();
            triggerAutosave();
        }

        // 5. Undo / Redo
        function pushUndoState() {
            if (isUndoRedoAction || !editor) return;
            const html = editor.innerHTML;
            if (historyIndex >= 0 && history[historyIndex] === html) return;
            history = history.slice(0, historyIndex + 1);
            history.push(html);
            historyIndex++;
            if (history.length > 40) {
                history.shift();
                historyIndex--;
            }
        }

        function performUndo() {
            if (historyIndex > 0) {
                historyIndex--;
                applySnapshot();
            }
        }

        function performRedo() {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                applySnapshot();
            }
        }

        function applySnapshot() {
            isUndoRedoAction = true;
            editor.innerHTML = history[historyIndex];
            sanitizeDOM();
            const b = getCurrentBlock();
            if (b) setCaretToEnd(b);
            updateFormatPills(b ? b.getAttribute('data-type') : 'action');
            updatePagination();
            updateStats();
            setTimeout(() => { isUndoRedoAction = false; }, 30);
        }

        // 6. Pagination & Stats
        let pageTimer;
        function updatePagination() {
            clearTimeout(pageTimer);
            pageTimer = setTimeout(() => {
                if (!pageShadow || !editor) return;
                pageShadow.querySelectorAll('.page-break-overlay, .page-number-overlay').forEach(el => el.remove());

                const pageHeight = 1056;
                const h = editor.offsetHeight;
                const numPages = Math.max(1, Math.ceil(h / pageHeight));

                pageShadow.style.minHeight = `${Math.max(1056, numPages * pageHeight)}px`;

                for (let i = 1; i < numPages; i++) {
                    const y = i * pageHeight;
                    const line = document.createElement('div');
                    line.className = 'page-break-overlay';
                    line.style.top = `${y}px`;
                    pageShadow.appendChild(line);

                    const num = document.createElement('div');
                    num.className = 'page-number-overlay';
                    num.style.top = `${y}px`;
                    num.textContent = `${i + 1}.`;
                    pageShadow.appendChild(num);
                }

                if (statPages) statPages.textContent = `${numPages} Page${numPages !== 1 ? 's' : ''}`;
                if (statTime) statTime.textContent = `~${numPages} min screen time`;
            }, 250);
        }

        function updateStats() {
            if (!editor) return;
            const text = editor.innerText || '';
            const words = text.split(/\s+/).filter(w => w.trim().length > 0).length;
            const scenes = editor.querySelectorAll('.script-block.scene-heading').length;

            if (statWords) statWords.textContent = `${words} Word${words !== 1 ? 's' : ''}`;
            if (statScenes) statScenes.textContent = `${scenes} Scene${scenes !== 1 ? 's' : ''}`;
        }

        // 7. Event Listeners Setup
        editor.addEventListener('keydown', (e) => {
            const isMod = e.ctrlKey || e.metaKey;

            // Autocomplete
            if (suggestionsActive) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    itemPool[activeSuggestionIndex].classList.remove('active');
                    activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestions.length;
                    itemPool[activeSuggestionIndex].classList.add('active');
                    itemPool[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    itemPool[activeSuggestionIndex].classList.remove('active');
                    activeSuggestionIndex = (activeSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
                    itemPool[activeSuggestionIndex].classList.add('active');
                    itemPool[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    applySuggestion();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideSuggestions();
                    return;
                }
            }

            // Escape
            if (e.key === 'Escape') {
                if (document.body.classList.contains('focus-mode')) {
                    document.body.classList.remove('focus-mode');
                    if (toggleFocusBtn) toggleFocusBtn.classList.remove('active');
                }
                if (versionModal) versionModal.classList.add('hidden');
                hideSuggestions();
                return;
            }

            // Save: Ctrl+S
            if (isMod && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveScreenplayToFile();
                return;
            }

            // Open: Ctrl+O
            if (isMod && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                openScreenplayFromFile();
                return;
            }

            // Undo / Redo
            if (isMod && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) performRedo();
                else performUndo();
                return;
            }
            if (isMod && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                performRedo();
                return;
            }

            // Ctrl+1..7 Hotkeys
            const hotkeyMap = { '1': 'scene-heading', '2': 'action', '3': 'character', '4': 'parenthetical', '5': 'dialogue', '6': 'transition', '7': 'shot' };
            if (isMod && hotkeyMap[e.key]) {
                e.preventDefault();
                const b = getCurrentBlock();
                if (b) {
                    changeBlockFormat(b, hotkeyMap[e.key]);
                    updateFormatPills(hotkeyMap[e.key]);
                    checkSuggestions(b);
                    pushUndoState();
                }
                return;
            }

            // Enter
            if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(getCurrentBlock());
                return;
            }

            // Tab
            if (e.key === 'Tab') {
                e.preventDefault();
                handleTab(getCurrentBlock(), e.shiftKey);
                return;
            }

            // Backspace
            if (e.key === 'Backspace') {
                const b = getCurrentBlock();
                if (b && getCaretOffset(b) === 0) {
                    const sel = window.getSelection();
                    if (sel && sel.isCollapsed) {
                        e.preventDefault();
                        handleBackspace(b);
                    }
                }
                return;
            }
        });

        editor.addEventListener('input', () => {
            const b = getCurrentBlock();
            if (b) {
                checkAutoRecognition(b);
                // Instant keystroke filtering!
                checkSuggestions(b);
            }
            updateStats();
            updatePagination();
            triggerAutosave();
        });

        editor.addEventListener('click', () => {
            const b = getCurrentBlock();
            if (b) updateFormatPills(b.getAttribute('data-type') || 'action');
        });

        editor.addEventListener('mousedown', (e) => {
            if (e.target === editor) {
                const blocks = editor.querySelectorAll('.script-block');
                if (blocks.length > 0) {
                    setTimeout(() => setCaretToEnd(blocks[blocks.length - 1]), 10);
                }
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (suggestionsBox && !suggestionsBox.contains(e.target)) hideSuggestions();
            if (exportDropdown && !exportDropdown.contains(e.target) && e.target !== exportMenuBtn) {
                exportDropdown.classList.add('hidden');
            }
        });

        // Format Buttons
        formatButtons.forEach(btn => {
            const applyFmt = () => {
                const target = btn.getAttribute('data-fmt');
                const b = getCurrentBlock();
                if (b) {
                    changeBlockFormat(b, target);
                    setCaretToEnd(b);
                    updateFormatPills(target);
                    checkSuggestions(b);
                    pushUndoState();
                    updatePagination();
                    triggerAutosave();
                }
            };
            btn.addEventListener('mousedown', (e) => { e.preventDefault(); applyFmt(); });
            btn.addEventListener('click', applyFmt);
        });

        // 8. Autosave (LocalStorage & IndexedDB)
        function triggerAutosave() {
            if (saveIndicator) {
                saveIndicator.textContent = 'Saving...';
                saveIndicator.classList.add('saving');
            }
            clearTimeout(autosaveTimer);
            autosaveTimer = setTimeout(() => {
                saveToStorage();
                if (saveIndicator) {
                    saveIndicator.textContent = 'Saved';
                    saveIndicator.classList.remove('saving');
                }
            }, 750);
        }

        function saveToStorage() {
            try {
                localStorage.setItem('cinecore-script', editor.innerHTML);
                if (tpTitle) localStorage.setItem('cinecore-tp-title', tpTitle.value);
                if (tpAuthor) localStorage.setItem('cinecore-tp-author', tpAuthor.value);
                if (tpSource) localStorage.setItem('cinecore-tp-source', tpSource.value);
                if (tpContact) localStorage.setItem('cinecore-tp-contact', tpContact.value);
                localStorage.setItem('cinecore-entities', JSON.stringify(entityDictionary.serialize()));
            } catch (err) {
                console.warn('Storage save failed:', err);
            }
        }

        [tpTitle, tpAuthor, tpSource, tpContact].forEach(inp => {
            if (inp) inp.addEventListener('input', triggerAutosave);
        });

        // 9. File Operations (Open / Save)
        function generateFountainText() {
            const lines = [];
            if (tpTitle && tpTitle.value.trim()) {
                lines.push(`Title: ${tpTitle.value.trim()}`);
                if (tpAuthor && tpAuthor.value.trim()) lines.push(`Author: ${tpAuthor.value.trim()}`);
                if (tpSource && tpSource.value.trim()) lines.push(`Source: ${tpSource.value.trim()}`);
                if (tpContact && tpContact.value.trim()) lines.push(`Contact:\n    ${tpContact.value.trim().replace(/\n/g, '\n    ')}`);
                lines.push('\n');
            }

            editor.querySelectorAll('.script-block').forEach(b => {
                const t = b.getAttribute('data-type');
                const txt = (b.innerText || '').trim();
                if (!txt) return;

                if (t === 'scene-heading') lines.push(`\n${txt}`);
                else if (t === 'character') lines.push(`\n${txt.toUpperCase()}`);
                else if (t === 'parenthetical') lines.push(txt);
                else if (t === 'dialogue') lines.push(txt);
                else if (t === 'transition') lines.push(`\n> ${txt}`);
                else lines.push(`\n${txt}`);
            });

            return lines.join('\n');
        }

        function downloadFile(content, filename) {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        async function saveScreenplayToFile() {
            const title = (tpTitle && tpTitle.value.trim()) || 'screenplay';
            const fountain = generateFountainText();

            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.fountain`,
                        types: [{ description: 'Fountain Script (*.fountain)', accept: { 'text/plain': ['.fountain'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(fountain);
                    await writable.close();
                    if (saveIndicator) {
                        saveIndicator.textContent = `Saved to ${handle.name}`;
                        setTimeout(() => { saveIndicator.textContent = 'Saved'; }, 2000);
                    }
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                }
            }

            downloadFile(fountain, `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.fountain`);
        }

        function openScreenplayFromFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.fountain,.txt';
            input.onchange = async () => {
                if (input.files && input.files[0]) {
                    const text = await input.files[0].text();
                    const lines = text.split(/\r?\n/);
                    const blocks = [];

                    lines.forEach(l => {
                        const tr = l.trim();
                        if (!tr) return;
                        const u = tr.toUpperCase();
                        if (u.startsWith('INT.') || u.startsWith('EXT.') || u.startsWith('INT/EXT.')) {
                            blocks.push(`<div class="script-block scene-heading" data-type="scene-heading">${tr}</div>`);
                        } else if (tr.startsWith('(') && tr.endsWith(')')) {
                            blocks.push(`<div class="script-block parenthetical" data-type="parenthetical">${tr}</div>`);
                        } else if (tr.startsWith('>') || u.endsWith('TO:')) {
                            blocks.push(`<div class="script-block transition" data-type="transition">${tr.replace(/^>\s*/, '')}</div>`);
                        } else if (tr === u && tr.length < 35 && !tr.endsWith('.')) {
                            blocks.push(`<div class="script-block character" data-type="character">${tr}</div>`);
                        } else {
                            blocks.push(`<div class="script-block action" data-type="action">${tr}</div>`);
                        }
                    });

                    if (blocks.length > 0) {
                        editor.innerHTML = blocks.join('');
                        sanitizeDOM();
                        entityDictionary.seedFromDOM(editor);
                        updatePagination();
                        updateStats();
                        pushUndoState();
                        triggerAutosave();
                    }
                }
            };
            input.click();
        }

        if (openFileBtn) openFileBtn.addEventListener('click', openScreenplayFromFile);
        if (saveFileBtn) saveFileBtn.addEventListener('click', saveScreenplayToFile);

        // 10. Toolbar Controls
        if (toggleFocusBtn) {
            toggleFocusBtn.addEventListener('click', () => {
                document.body.classList.toggle('focus-mode');
                toggleFocusBtn.classList.toggle('active');
            });
        }

        if (toggleTitleBtn) {
            toggleTitleBtn.addEventListener('click', () => {
                const isShowingTitle = !titleView.classList.contains('hidden');
                if (isShowingTitle) {
                    titleView.classList.add('hidden');
                    scriptView.classList.remove('hidden');
                    toggleTitleBtn.textContent = 'Title Page';
                    toggleTitleBtn.classList.remove('active');
                    const b = getCurrentBlock();
                    if (b) setCaretToEnd(b);
                } else {
                    scriptView.classList.add('hidden');
                    titleView.classList.remove('hidden');
                    toggleTitleBtn.textContent = 'Script Editor';
                    toggleTitleBtn.classList.add('active');
                    if (tpTitle) tpTitle.focus();
                }
            });
        }

        function toggleSceneNums(forced) {
            showSceneNumbers = typeof forced === 'boolean' ? forced : !showSceneNumbers;
            if (toggleSceneBtn) {
                if (showSceneNumbers) {
                    editor.classList.add('show-scene-numbers');
                    toggleSceneBtn.textContent = 'Scene Nums: ON';
                    toggleSceneBtn.classList.add('active');
                } else {
                    editor.classList.remove('show-scene-numbers');
                    toggleSceneBtn.textContent = 'Scene Nums: OFF';
                    toggleSceneBtn.classList.remove('active');
                }
            }
        }
        if (toggleSceneBtn) toggleSceneBtn.addEventListener('click', () => toggleSceneNums());

        if (sampleScriptBtn) {
            sampleScriptBtn.addEventListener('click', () => {
                if (confirm('Load sample screenplay scene? Any unsaved edits will be replaced.')) {
                    editor.innerHTML = SAMPLE_SCRIPT_HTML;
                    sanitizeDOM();
                    entityDictionary.seedFromDOM(editor);
                    // Seed custom requested character entities
                    entityDictionary.learn('character', 'ARUN');
                    entityDictionary.learn('character', 'DEERAJ');
                    entityDictionary.learn('character', 'DHEENA');
                    entityDictionary.learn('character', 'HARISH');
                    updatePagination();
                    updateStats();
                    pushUndoState();
                    triggerAutosave();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear the entire screenplay and start fresh?')) {
                    editor.innerHTML = '<div class="script-block scene-heading" data-type="scene-heading">INT. NEW SCENE - DAY</div>';
                    if (tpTitle) tpTitle.value = '';
                    if (tpAuthor) tpAuthor.value = '';
                    if (tpSource) tpSource.value = '';
                    if (tpContact) tpContact.value = '';
                    sanitizeDOM();
                    updatePagination();
                    updateStats();
                    pushUndoState();
                    triggerAutosave();
                }
            });
        }

        // Export Actions
        if (exportMenuBtn) {
            exportMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (exportDropdown) exportDropdown.classList.toggle('hidden');
            });
        }
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                if (exportDropdown) exportDropdown.classList.add('hidden');
                window.print();
            });
        }
        if (exportFountainBtn) {
            exportFountainBtn.addEventListener('click', () => {
                if (exportDropdown) exportDropdown.classList.add('hidden');
                const t = (tpTitle && tpTitle.value.trim()) || 'screenplay';
                downloadFile(generateFountainText(), `${t.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.fountain`);
            });
        }
        if (exportTxtBtn) {
            exportTxtBtn.addEventListener('click', () => {
                if (exportDropdown) exportDropdown.classList.add('hidden');
                const t = (tpTitle && tpTitle.value.trim()) || 'screenplay';
                const lines = Array.from(editor.querySelectorAll('.script-block')).map(b => b.innerText || '');
                downloadFile(lines.join('\n\n'), `${t.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.txt`);
            });
        }

        // Version History Modal
        if (versionHistoryBtn) {
            versionHistoryBtn.addEventListener('click', () => {
                renderSnapshots();
                if (versionModal) versionModal.classList.remove('hidden');
            });
        }
        if (closeVersionModalBtn) {
            closeVersionModalBtn.addEventListener('click', () => {
                if (versionModal) versionModal.classList.add('hidden');
            });
        }
        if (versionModal) {
            versionModal.addEventListener('mousedown', (e) => {
                if (e.target === versionModal) versionModal.classList.add('hidden');
            });
        }

        let snapshots = [];
        try {
            snapshots = JSON.parse(localStorage.getItem('cinecore-snapshots') || '[]');
        } catch (e) {
            snapshots = [];
        }

        function renderSnapshots() {
            if (!versionList) return;
            if (snapshots.length === 0) {
                versionList.innerHTML = '<div class="empty-versions">No snapshots created yet. Click "Create Snapshot Now" to create one.</div>';
                return;
            }
            versionList.innerHTML = '';
            snapshots.forEach((snap, idx) => {
                const div = document.createElement('div');
                div.className = 'version-card';
                div.innerHTML = `
                    <div class="version-meta">
                        <span class="version-title">${snap.title || 'Checkpoint'}</span>
                        <span class="version-time">${snap.time}</span>
                        <span class="version-badge">${snap.words} words • ${snap.scenes} scenes</span>
                    </div>
                    <div class="version-actions">
                        <button class="btn secondary restore-btn" data-idx="${idx}">Restore</button>
                    </div>
                `;
                div.querySelector('.restore-btn').addEventListener('click', () => {
                    if (confirm(`Restore checkpoint from ${snap.time}?`)) {
                        editor.innerHTML = snap.content;
                        sanitizeDOM();
                        entityDictionary.seedFromDOM(editor);
                        updatePagination();
                        updateStats();
                        pushUndoState();
                        triggerAutosave();
                        if (versionModal) versionModal.classList.add('hidden');
                    }
                });
                versionList.appendChild(div);
            });
        }

        if (createSnapshotBtn) {
            createSnapshotBtn.addEventListener('click', () => {
                const words = (editor.innerText || '').split(/\s+/).filter(w => w.length > 0).length;
                const scenes = editor.querySelectorAll('.script-block.scene-heading').length;
                snapshots.unshift({
                    time: new Date().toLocaleString(),
                    title: (tpTitle && tpTitle.value.trim()) || 'Manual Checkpoint',
                    words,
                    scenes,
                    content: editor.innerHTML
                });
                if (snapshots.length > 20) snapshots.pop();
                try {
                    localStorage.setItem('cinecore-snapshots', JSON.stringify(snapshots));
                } catch (e) {}
                renderSnapshots();
            });
        }

        // Initial Load
        const savedScript = localStorage.getItem('cinecore-script');
        if (savedScript && savedScript.includes('script-block')) {
            editor.innerHTML = savedScript;
            if (tpTitle) tpTitle.value = localStorage.getItem('cinecore-tp-title') || '';
            if (tpAuthor) tpAuthor.value = localStorage.getItem('cinecore-tp-author') || '';
            if (tpSource) tpSource.value = localStorage.getItem('cinecore-tp-source') || '';
            if (tpContact) tpContact.value = localStorage.getItem('cinecore-tp-contact') || '';
            try {
                const savedEnt = JSON.parse(localStorage.getItem('cinecore-entities') || 'null');
                if (savedEnt) entityDictionary.deserialize(savedEnt);
            } catch (e) {}
        } else {
            editor.innerHTML = SAMPLE_SCRIPT_HTML;
            // Seed custom requested character entities
            entityDictionary.learn('character', 'ARUN');
            entityDictionary.learn('character', 'DEERAJ');
            entityDictionary.learn('character', 'DHEENA');
            entityDictionary.learn('character', 'HARISH');
        }

        sanitizeDOM();
        entityDictionary.seedFromDOM(editor);
        updatePagination();
        updateStats();
        pushUndoState();

        console.log('🎬 Cinecore Standalone Engine ready with Learned Entity Memory!');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStandalone);
    } else {
        initStandalone();
    }
})();
