/**
 * writer.js — Professional Writing Engine for CINECORE (Absolute Cinema)
 * "THE WRITER IS A CORE APPLICATION SUBSYSTEM, NOT AN ORDINARY TEXT BOX."
 * 
 * Features:
 * - Multi-format support: Screenplay, Stage Play, Documentary & Interview, AV Script, Creative Prose.
 * - Dual-Dialogue (Side-by-Side simultaneous speaking characters).
 * - Production Scene Numbers (Left & Right margins, toggle display).
 * - Distraction-Free Zen / Focus Mode (Fullscreen, clean ambience).
 * - Typewriter Scrolling (Fixed vertical eye-line at 45% screen height).
 * - Quick Character & Dialogue Extensions: (V.O.), (O.S.), (CONT'D), (INTO PHONE), (BEAT).
 * - Inline Author Script Notes with visibility toggle.
 * - Title Page Editor & Cover Page Generator.
 * - Industry Standard Export Studio: Printable PDF with cover & headers, Final Draft (.fdx), Fountain, TXT.
 * - Screenplay File Importer (.fountain, .txt, .fdx).
 * - Deep Script Analytics & Diagnostics (Dialogue:Action ratio, character word counts, health check).
 * - Enhanced Scene Navigator with live filtering and scene reordering (Move Up / Move Down).
 * - Production Color Draft Revisions: White, Blue, Pink, Yellow, Green, Goldenrod.
 * - 0ms Keystroke Learned Entity Memory Autocomplete.
 */

import { projects, seasons, episodes, screenplays, characters, locations, versions, scenes, scriptTags, breakdownItems } from '../store.js';
import { syncScreenplayScenes } from '../links.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { showToast } from '../components/toast.js';
import { Modal, confirmDialog } from '../components/modal.js';

import {
    WRITING_FORMATS,
    ELEMENT_TYPES,
    sanitizeDOM,
    getCurrentBlock,
    changeBlockFormat,
    setCaretToEnd,
    setCaretPosition,
    createBlock,
    createDualDialogueBlock,
    insertScriptNote,
    extractEditorBlocks,
    applyInlineStyle,
    insertScriptTag,
    computeAccurateStats
} from '../editor.js';

import {
    handleEnter,
    handleTab,
    handleBackspace,
    checkAutoRecognition
} from '../transitions.js';

import {
    generateFountain,
    generateFDX,
    printScreenplayPDF,
    parseAndImportFile
} from './export.js';

import { ShortcutManager } from '../shortcuts.js';
import { EntityDictionary } from '../entities.js';
import { Autocomplete } from '../autocomplete.js';
import { PaginationEngine } from '../pagination.js';

export async function renderWriter(container, params) {
    const projectId = params.id;
    const seasonId = params.sid || null;
    const episodeId = params.eid || null;

    const project = await projects.get(projectId);
    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);

    // Retrieve or create screenplay
    let screenplay = null;
    let episode = null;

    if (episodeId) {
        episode = await episodes.get(episodeId);
        screenplay = await screenplays.getByEpisode(episodeId);
        if (!screenplay) {
            screenplay = await screenplays.create({
                projectId,
                episodeId,
                title: `${project.name} — ${episode?.title || 'Episode'}`,
                format: 'screenplay',
                content: `Title: ${project.name.toUpperCase()} - ${(episode?.title || 'EPISODE').toUpperCase()}\nAuthor: Screenwriter\n\nEXT. SCENE START - DAY\n\n`
            });
        }
    } else {
        screenplay = await screenplays.getForProject(projectId);
        if (!screenplay) {
            screenplay = await screenplays.create({
                projectId,
                title: project.name,
                format: 'screenplay',
                content: `Title: ${project.name.toUpperCase()}\nAuthor: Screenwriter\n\nEXT. OPENING SCENE - DAY\n\nThe story begins.\n`
            });
        }
    }

    appState.set('currentScreenplay', screenplay);

    // Breadcrumbs
    const crumbs = [
        { label: project.name, href: `#/project/${project.id}` }
    ];
    if (episode) {
        crumbs.push({ label: 'Seasons', href: `#/project/${project.id}/seasons` });
        crumbs.push({ label: episode.title, href: `#/project/${project.id}/season/${seasonId}/episode/${episodeId}/writer` });
    } else {
        crumbs.push({ label: 'Writer', href: `#/project/${project.id}/writer` });
    }
    renderBreadcrumb(crumbs);

    const currentFormatId = screenplay.format || 'screenplay';
    const currentFormatDef = WRITING_FORMATS[currentFormatId] || WRITING_FORMATS.screenplay;
    const currentDraftColor = screenplay.revisionColor || 'white';

    // Render Writer DOM structure
    container.innerHTML = `
        <div class="writer-module-container revision-draft-${currentDraftColor}" id="writer-container">
            <!-- Format Bar & Main Toolbar -->
            <div class="writer-subbar">
                <div class="format-selection-group">
                    <select id="writer-format-select" class="form-select format-selector-select" title="Change Writing Format">
                        <option value="screenplay" ${currentFormatId === 'screenplay' ? 'selected' : ''}>Feature Screenplay</option>
                        <option value="stageplay" ${currentFormatId === 'stageplay' ? 'selected' : ''}>Stage Play</option>
                        <option value="documentary" ${currentFormatId === 'documentary' ? 'selected' : ''}>Documentary & Interview</option>
                        <option value="av" ${currentFormatId === 'av' ? 'selected' : ''}>AV Script (Two-Column)</option>
                        <option value="prose" ${currentFormatId === 'prose' ? 'selected' : ''}>Creative Writing & Prose</option>
                    </select>
                </div>

                <!-- Dynamic Format Type Buttons based on Format -->
                <div class="format-buttons-group" id="format-buttons-group">
                    ${renderFormatButtons(currentFormatDef)}
                </div>

                <!-- Inline Styling & Element Controls -->
                <div class="inline-format-group">
                    <button id="writer-bold-btn" class="fmt-icon-btn" title="Bold (Ctrl+B)"><b>B</b></button>
                    <button id="writer-italic-btn" class="fmt-icon-btn" title="Italic (Ctrl+I)"><i>I</i></button>
                    <button id="writer-underline-btn" class="fmt-icon-btn" title="Underline (Ctrl+U)"><u>U</u></button>
                    <button id="writer-tag-btn" class="btn small secondary" title="Tag Entity (@Character, #Location, !Prop)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>Tag
                    </button>
                    <button id="writer-find-btn" class="fmt-icon-btn" title="Find & Replace (Ctrl+F)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </button>
                </div>

                <!-- View Modes (Scene Numbers, Zen Mode, Typewriter, Notes) -->
                <div class="inline-format-group">
                    <button id="writer-scene-nums-btn" class="fmt-icon-btn" title="Toggle Scene Numbers (Ctrl+Shift+N)"><b>#</b></button>
                    <button id="writer-typewriter-btn" class="fmt-icon-btn" title="Toggle Typewriter Scrolling (Ctrl+Shift+T)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
                    </button>
                    <button id="writer-zen-btn" class="fmt-icon-btn" title="Distraction-Free Zen Mode (F11 / Ctrl+Shift+F)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                    </button>
                    <button id="writer-toggle-notes-btn" class="fmt-icon-btn" title="Toggle Script Notes Visibility">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </button>
                    <button id="writer-title-page-btn" class="btn small secondary" title="Edit Screenplay Title Page">
                        Cover
                    </button>
                </div>

                <!-- Right Actions -->
                <div class="writer-actions-group">
                    <span id="writer-save-indicator" class="save-indicator">Saved</span>
                    <a href="#/project/${project.id}/analysis" class="btn small primary" title="Run Script Analysis & Candidate Extraction">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>Analyze
                    </a>
                    <button id="writer-toggle-sidebar" class="btn small secondary" title="Toggle Context Sidebar & Scene Outline">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>Outline
                    </button>
                    <button id="writer-undo-btn" class="btn-icon-sub" title="Undo (Ctrl+Z)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>
                    <button id="writer-redo-btn" class="btn-icon-sub" title="Redo (Ctrl+Y)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                    <button id="writer-import-btn" class="btn small secondary" title="Import Script File (.fountain, .txt, .fdx)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Import
                    </button>
                    <input type="file" id="writer-import-file-input" style="display:none;" accept=".fountain,.txt,.fdx" />
                    <button id="writer-export-btn" class="btn small primary" title="Export Studio & PDF Generator (Ctrl+Shift+P)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Export
                    </button>
                </div>
            </div>

            <!-- Fast Extensions Bar (V.O., O.S., CONT'D, Dual-Dialogue, Note) -->
            <div class="writer-extensions-bar" id="writer-extensions-bar">
                <span style="font-size:0.68rem; font-weight:700; color:var(--app-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-right:0.35rem;">QUICK:</span>
                <button class="ext-chip-btn" data-ext="(V.O.)" title="Voice Over">(V.O.)</button>
                <button class="ext-chip-btn" data-ext="(O.S.)" title="Off Screen">(O.S.)</button>
                <button class="ext-chip-btn" data-ext="(CONT'D)" title="Continued speech">(CONT'D)</button>
                <button class="ext-chip-btn" data-ext="(beat)" title="Parenthetical Beat">(beat)</button>
                <button class="ext-chip-btn" data-ext="(into phone)" title="Into phone speech">(into phone)</button>
                <button class="ext-chip-btn" id="ext-dual-dialogue-btn" title="Insert Dual Dialogue (Simultaneous Speech)">Dual Dialogue</button>
                <button class="ext-chip-btn" id="ext-script-note-btn" title="Insert Author Note (Ctrl+8)">+ Note</button>
                <div style="margin-left:auto; display:flex; align-items:center; gap:0.4rem;">
                    <span style="font-size:0.68rem; color:var(--app-text-muted);">DRAFT COLOR:</span>
                    <select id="writer-revision-select" class="form-select" style="padding:1px 6px; font-size:0.72rem; height:22px; width:auto;">
                        <option value="white" ${currentDraftColor === 'white' ? 'selected' : ''}>White (1st)</option>
                        <option value="blue" ${currentDraftColor === 'blue' ? 'selected' : ''}>Blue (2nd)</option>
                        <option value="pink" ${currentDraftColor === 'pink' ? 'selected' : ''}>Pink (3rd)</option>
                        <option value="yellow" ${currentDraftColor === 'yellow' ? 'selected' : ''}>Yellow (4th)</option>
                        <option value="green" ${currentDraftColor === 'green' ? 'selected' : ''}>Green (5th)</option>
                        <option value="goldenrod" ${currentDraftColor === 'goldenrod' ? 'selected' : ''}>Goldenrod</option>
                    </select>
                </div>
            </div>

            <!-- Floating Find & Replace Bar -->
            <div class="find-replace-bar hidden" id="find-replace-bar">
                <div class="find-inputs">
                    <input type="text" id="find-input" placeholder="Find text..." />
                    <input type="text" id="replace-input" placeholder="Replace with..." />
                </div>
                <div class="find-actions">
                    <span id="find-count" class="find-count">0 of 0</span>
                    <button id="find-prev-btn" class="btn small secondary">Prev</button>
                    <button id="find-next-btn" class="btn small secondary">Next</button>
                    <button id="find-replace-btn" class="btn small secondary">Replace</button>
                    <button id="find-replace-all-btn" class="btn small primary">Replace All</button>
                    <button id="find-close-btn" class="btn-icon-sub" title="Close">✕</button>
                </div>
            </div>

            <!-- Floating Zen Mode Exit Pill -->
            <button id="writer-zen-exit" class="writer-zen-exit-pill hidden" title="Exit Focus Mode (Esc)">
                ✕ Exit Focus Mode (Esc)
            </button>

            <!-- Screenplay Page Canvas Area & Sidebar -->
            <div class="writer-body-layout" style="display: flex; flex: 1; min-height: 0; overflow: hidden; position: relative; width: 100%;">
                <div class="script-scroll-canvas" id="script-scroll-canvas">
                    <div class="page-shadow" id="page-shadow">
                        <div id="editor" class="editor script-page format-${currentFormatId}" contenteditable="true" spellcheck="true" autocomplete="off" autocapitalize="off"></div>
                    </div>
                    <!-- Autocomplete suggestions box -->
                    <ul id="suggestions-box" class="suggestions-box hidden"></ul>
                </div>

                <!-- Screenplay Contextual Sidebar & Scene Navigator -->
                <div class="writer-context-sidebar hidden" id="writer-context-sidebar">
                    <div class="context-sec-header">
                        <span>Current Scene</span>
                        <span id="ctx-scene-badge" class="badge">--</span>
                    </div>
                    <div style="padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--app-border);">
                        <div id="ctx-scene-title" style="font-weight: 700; font-size: 0.88rem; color: var(--app-text); margin-bottom: 0.35rem;">Click inside a scene</div>
                        <div id="ctx-scene-meta" style="font-size: 0.75rem; color: var(--app-text-muted);">INT/EXT • TIME</div>
                        <div id="ctx-quick-links" style="display: flex; gap: 0.4rem; margin-top: 0.6rem; flex-wrap: wrap;"></div>
                    </div>

                    <div class="context-sec-header">
                        <span>Characters in Scene</span>
                        <span id="ctx-chars-count" class="badge">0</span>
                    </div>
                    <div id="ctx-chars-list" class="context-item-list"></div>

                    <div class="context-sec-header">
                        <span>Location Reference</span>
                    </div>
                    <div id="ctx-location-box" style="padding: 0.5rem 0.85rem; font-size: 0.82rem; color: var(--app-text-muted);">
                        No location tagged
                    </div>

                    <div class="context-sec-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <span>Scene Navigator</span>
                        <span id="ctx-scenes-count" class="badge">0</span>
                    </div>
                    <div style="padding: 0.35rem 0.75rem; border-bottom: 1px solid var(--app-border);">
                        <input type="text" id="ctx-scene-search" class="form-input" style="padding: 3px 8px; font-size: 0.75rem;" placeholder="Filter scenes..." />
                    </div>
                    <div id="ctx-scenes-nav" class="context-item-list" style="max-height: 250px; overflow-y: auto;"></div>
                </div>
            </div>

            <!-- Bottom Live Stats Bar (Clickable for Full Analytics) -->
            <div class="writer-footer-bar" id="writer-footer-bar" style="cursor: pointer;" title="Click for Detailed Script Analytics & Diagnostics">
                <div class="writer-stats-left">
                    <span id="stat-pages">Page 1 est.</span>
                    <span class="stat-separator">•</span>
                    <span id="stat-words">0 words</span>
                    <span class="stat-separator">•</span>
                    <span id="stat-chars">0 chars</span>
                    <span class="stat-separator">•</span>
                    <span id="stat-paras">0 blocks</span>
                    <span class="stat-separator">•</span>
                    <span id="stat-scenes">0 scenes</span>
                    <span class="stat-separator">•</span>
                    <span id="stat-tags">0 tags</span>
                    <span class="stat-separator">•</span>
                    <span id="stat-read-time">~1 min read</span>
                </div>
                <div class="writer-stats-right">
                    <span id="current-format-label">ACTION</span>
                </div>
            </div>
        </div>
    `;

    initWriterInstance(container, project, screenplay);
}

function renderFormatButtons(formatDef) {
    return formatDef.types.map((t, idx) => `
        <button class="fmt-btn ${idx === 0 ? 'active' : ''}" data-format="${t.id}" title="${t.label} (${t.shortcut})">${t.label}</button>
    `).join('');
}

async function initWriterInstance(container, project, screenplay) {
    const editor = container.querySelector('#editor');
    const suggestionsBox = container.querySelector('#suggestions-box');
    const saveIndicator = container.querySelector('#writer-save-indicator');
    const formatButtonsGroup = container.querySelector('#format-buttons-group');
    const formatLabel = container.querySelector('#current-format-label');
    const formatSelect = container.querySelector('#writer-format-select');
    const writerContainer = container.querySelector('#writer-container');
    const canvas = container.querySelector('#script-scroll-canvas');

    // Toggles state
    let isZenMode = false;
    let isTypewriterActive = false;
    let areSceneNumbersActive = Boolean(screenplay.showSceneNumbers);
    let areNotesHidden = false;

    if (areSceneNumbersActive) {
        editor.classList.add('show-scene-numbers');
        container.querySelector('#writer-scene-nums-btn')?.classList.add('active');
    }

    // Context Sidebar Elements
    const contextSidebar = container.querySelector('#writer-context-sidebar');
    const toggleSidebarBtn = container.querySelector('#writer-toggle-sidebar');

    // Find & Replace Elements
    const findReplaceBar = container.querySelector('#find-replace-bar');
    const findBtn = container.querySelector('#writer-find-btn');
    const findInput = container.querySelector('#find-input');
    const replaceInput = container.querySelector('#replace-input');
    const findCount = container.querySelector('#find-count');

    // Populate Entity Dictionary with project Characters, Locations & Props/Breakdown Items
    const entityDictionary = new EntityDictionary();
    const [projChars, projLocs, projBreakdowns] = await Promise.all([
        characters.getByProject(project.id),
        locations.getByProject(project.id),
        breakdownItems.getByProject(project.id)
    ]);

    projChars.forEach(c => {
        const key = c.name.toUpperCase().trim();
        entityDictionary.characters.set(key, {
            name: c.name.toUpperCase(),
            usageCount: 15,
            lastUsed: Date.now(),
            originalFormatting: c.name.toUpperCase()
        });
    });

    projLocs.forEach(l => {
        const key = l.name.toUpperCase().trim();
        entityDictionary.locations.set(key, {
            name: l.name.toUpperCase(),
            usageCount: 15,
            lastUsed: Date.now(),
            originalFormatting: l.name.toUpperCase()
        });
    });

    projBreakdowns.forEach(b => {
        if (b.name) {
            const key = b.name.toUpperCase().trim();
            entityDictionary.props.set(key, {
                name: b.name.toUpperCase(),
                usageCount: 10,
                lastUsed: Date.now(),
                originalFormatting: b.name.toUpperCase(),
                category: b.category || 'props'
            });
        }
    });

    if (screenplay.entityData) {
        entityDictionary.deserialize(screenplay.entityData);
    }

    // Populate editor content
    if (screenplay.htmlContent) {
        editor.innerHTML = screenplay.htmlContent;
    } else {
        populateEditor(editor, screenplay.content || '');
    }
    sanitizeDOM(editor);

    // Initialize Autocomplete
    const autocomplete = new Autocomplete(suggestionsBox, entityDictionary, {
        onApply: async (info) => {
            if (info && info.entityType && info.name) {
                try {
                    await scriptTags.create({
                        projectId: project.id,
                        screenplayId: screenplay.id,
                        tagType: info.entityType,
                        label: info.name
                    });
                    if (info.entityType === 'prop') {
                        const existingProps = await breakdownItems.getByProject(project.id);
                        if (!existingProps.some(p => p.name.toUpperCase() === info.name.toUpperCase())) {
                            await breakdownItems.create({
                                projectId: project.id,
                                category: 'props',
                                name: info.name
                            });
                        }
                    }
                } catch (err) {
                    console.warn('Could not persist script tag:', err);
                }
            }
            triggerSave();
            updateStats();
        }
    });

    // Initialize Pagination Engine
    const pagination = new PaginationEngine(editor, container.querySelector('#page-shadow'));

    // Initialize Shortcut Manager
    const shortcuts = new ShortcutManager({
        editor,
        onSave: () => triggerSave(true),
        onFormatChanged: (fmt) => updateFormatUI(fmt),
        onFindReplace: () => toggleFindReplace(),
        onZenMode: () => toggleZenMode(),
        onTypewriter: () => toggleTypewriter(),
        onSceneNumbers: () => toggleSceneNumbers(),
        onDualDialogue: () => insertDualDialogue(),
        onExportPDF: () => openExportModal(),
        onEscape: () => {
            if (isZenMode) toggleZenMode();
            const findBar = container.querySelector('#find-replace-bar');
            if (findBar && !findBar.classList.contains('hidden')) toggleFindReplace();
            autocomplete.hide();
        }
    });
    shortcuts.attach(editor);

    // Update active format UI
    function updateFormatUI(forceType = null) {
        const currentBlock = getCurrentBlock(editor);
        const type = forceType || (currentBlock ? currentBlock.getAttribute('data-type') : 'action');

        container.querySelectorAll('.fmt-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-format') === type);
        });

        if (formatLabel) {
            formatLabel.textContent = (type || 'ACTION').replace(/-/g, ' ').toUpperCase();
        }
    }

    function setFormat(fmt) {
        const block = getCurrentBlock(editor);
        if (block) {
            changeBlockFormat(block, fmt);
            updateFormatUI(fmt);
            triggerSave();
            updateStats();
        }
    }

    function bindFormatButtons() {
        container.querySelectorAll('.fmt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fmt = btn.getAttribute('data-format');
                setFormat(fmt);
                editor.focus();
            });
        });
    }
    bindFormatButtons();

    // ─── ZEN / FOCUS MODE ────────────────────────────────────────────────────────
    function toggleZenMode() {
        isZenMode = !isZenMode;
        writerContainer.classList.toggle('writer-zen-mode', isZenMode);
        const exitPill = container.querySelector('#writer-zen-exit');
        if (exitPill) exitPill.classList.toggle('hidden', !isZenMode);
        showToast(isZenMode ? 'Focus Mode enabled (Esc to exit)' : 'Focus Mode exited', 'info');
        editor.focus();
    }

    container.querySelector('#writer-zen-btn')?.addEventListener('click', toggleZenMode);
    container.querySelector('#writer-zen-exit')?.addEventListener('click', toggleZenMode);

    // ─── TYPEWRITER SCROLLING ──────────────────────────────────────────────────
    function toggleTypewriter() {
        isTypewriterActive = !isTypewriterActive;
        canvas.classList.toggle('typewriter-mode', isTypewriterActive);
        container.querySelector('#writer-typewriter-btn')?.classList.toggle('active', isTypewriterActive);
        showToast(isTypewriterActive ? 'Typewriter Eye-Line Centering ON' : 'Typewriter Mode OFF', 'info');
        if (isTypewriterActive) applyTypewriterScroll();
    }

    function applyTypewriterScroll() {
        if (!isTypewriterActive) return;
        const block = getCurrentBlock(editor);
        if (block) {
            const blockRect = block.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const offset = blockRect.top - canvasRect.top - (canvasRect.height * 0.45);
            if (Math.abs(offset) > 15) {
                canvas.scrollTop += offset;
            }
        }
    }

    container.querySelector('#writer-typewriter-btn')?.addEventListener('click', toggleTypewriter);

    // ─── SCENE NUMBERS TOGGLE ──────────────────────────────────────────────────
    async function toggleSceneNumbers() {
        areSceneNumbersActive = !areSceneNumbersActive;
        editor.classList.toggle('show-scene-numbers', areSceneNumbersActive);
        container.querySelector('#writer-scene-nums-btn')?.classList.toggle('active', areSceneNumbersActive);
        await screenplays.update(screenplay.id, { showSceneNumbers: areSceneNumbersActive });
        showToast(areSceneNumbersActive ? 'Production Scene Numbers visible' : 'Scene Numbers hidden', 'info');
    }

    container.querySelector('#writer-scene-nums-btn')?.addEventListener('click', toggleSceneNumbers);

    // ─── SCRIPT NOTES TOGGLE ───────────────────────────────────────────────────
    function toggleScriptNotes() {
        areNotesHidden = !areNotesHidden;
        editor.classList.toggle('hide-script-notes', areNotesHidden);
        container.querySelector('#writer-toggle-notes-btn')?.classList.toggle('active', !areNotesHidden);
        showToast(areNotesHidden ? 'Author notes hidden' : 'Author notes visible', 'info');
    }

    container.querySelector('#writer-toggle-notes-btn')?.addEventListener('click', toggleScriptNotes);

    // ─── DUAL DIALOGUE INSERTION ───────────────────────────────────────────────
    function insertDualDialogue() {
        const activeBlock = getCurrentBlock(editor);
        const dualRow = createDualDialogueBlock('CHARACTER 1', 'Dialogue 1', 'CHARACTER 2', 'Dialogue 2');
        if (activeBlock && activeBlock.parentNode) {
            activeBlock.after(dualRow);
        } else {
            editor.appendChild(dualRow);
        }
        dualRow.querySelector('.dual-dial')?.focus();
        shortcuts.pushUndoState();
        triggerSave();
        updateStats();
        showToast('Dual Dialogue inserted', 'success');
    }

    container.querySelector('#ext-dual-dialogue-btn')?.addEventListener('click', insertDualDialogue);

    // ─── SCRIPT NOTE INSERTION ─────────────────────────────────────────────────
    function insertNotePrompt() {
        insertScriptNote('Author note...');
        shortcuts.pushUndoState();
        triggerSave();
        updateStats();
        showToast('Script Note created', 'success');
    }

    container.querySelector('#ext-script-note-btn')?.addEventListener('click', insertNotePrompt);

    // ─── EXTENSIONS BAR (V.O., O.S., CONT'D, BEAT, ETC.) ──────────────────────
    container.querySelectorAll('.ext-chip-btn[data-ext]').forEach(btn => {
        btn.addEventListener('click', () => {
            const ext = btn.getAttribute('data-ext');
            const block = getCurrentBlock(editor);
            if (!block) return;

            const type = block.getAttribute('data-type');
            if (type === 'character') {
                let text = (block.innerText || block.textContent || '').replace(/\(.*\)/g, '').trim().toUpperCase();
                block.textContent = `${text} ${ext}`;
            } else if (type === 'dialogue') {
                if (ext.startsWith('(') && !ext.includes('V.O.') && !ext.includes('O.S.') && !ext.includes('CONT')) {
                    // Insert parenthetical
                    const parenthetical = createBlock('parenthetical', ext);
                    block.before(parenthetical);
                } else {
                    // Append to previous character
                    const prev = block.previousElementSibling;
                    if (prev && prev.getAttribute('data-type') === 'character') {
                        let text = prev.textContent.replace(/\(.*\)/g, '').trim().toUpperCase();
                        prev.textContent = `${text} ${ext}`;
                    }
                }
            }
            editor.focus();
            shortcuts.pushUndoState();
            triggerSave();
            updateFormatUI();
        });
    });

    // ─── INLINE FORMATTING BUTTONS ─────────────────────────────────────────────
    container.querySelector('#writer-bold-btn')?.addEventListener('click', () => {
        applyInlineStyle('bold');
        shortcuts.pushUndoState();
        editor.focus();
    });

    container.querySelector('#writer-italic-btn')?.addEventListener('click', () => {
        applyInlineStyle('italic');
        shortcuts.pushUndoState();
        editor.focus();
    });

    container.querySelector('#writer-underline-btn')?.addEventListener('click', () => {
        applyInlineStyle('underline');
        shortcuts.pushUndoState();
        editor.focus();
    });

    container.querySelector('#writer-tag-btn')?.addEventListener('click', () => {
        openTaggingModal();
    });

    function openTaggingModal() {
        const sel = window.getSelection();
        let selectedText = '';
        let savedRange = null;

        if (sel && sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
            if (!sel.isCollapsed) {
                selectedText = sel.toString().trim();
            }
        }

        const modal = new Modal({
            title: 'Tag Script Entity',
            content: `
                <div class="tag-modal-form" style="display:flex; flex-direction:column; gap:1rem;">
                    <p style="font-size:0.85rem; color:var(--app-text-muted); margin:0;">
                        Tag characters, locations, props, or costumes to connect them directly to breakdown and production items.
                    </p>
                    <div class="form-group">
                        <label class="form-label">Entity Type</label>
                        <select id="modal-tag-type" class="form-select">
                            <option value="character">@ Character</option>
                            <option value="location"># Location</option>
                            <option value="prop">! Prop / Item</option>
                            <option value="costume">% Costume / Wardrobe</option>
                            <option value="vfx">* VFX / SFX / Stunt</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Entity Label / Name</label>
                        <input type="text" id="modal-tag-label" class="form-input" placeholder="e.g. SILVER REVOLVER, KAI, PENTHOUSE" value="${escapeHtml(selectedText)}" />
                    </div>
                </div>
            `,
            confirmText: 'Insert Tag',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const typeInput = document.getElementById('modal-tag-type');
                const labelInput = document.getElementById('modal-tag-label');
                const tagType = typeInput ? typeInput.value : 'character';
                const tagLabel = labelInput ? labelInput.value.trim().toUpperCase() : '';

                if (!tagLabel) return;

                editor.focus();
                if (savedRange && sel) {
                    sel.removeAllRanges();
                    sel.addRange(savedRange);
                }

                insertScriptTag(tagType, tagLabel);
                entityDictionary.learn(tagType === 'costume' || tagType === 'vfx' ? 'prop' : tagType, tagLabel, true);

                try {
                    await scriptTags.create({
                        projectId: project.id,
                        screenplayId: screenplay.id,
                        tagType: tagType,
                        label: tagLabel
                    });

                    if (tagType === 'prop' || tagType === 'costume') {
                        const existingProps = await breakdownItems.getByProject(project.id);
                        if (!existingProps.some(p => p.name.toUpperCase() === tagLabel.toUpperCase())) {
                            await breakdownItems.create({
                                projectId: project.id,
                                category: tagType === 'costume' ? 'wardrobe' : 'props',
                                name: tagLabel
                            });
                        }
                    }
                } catch (err) {
                    console.warn('Tag persistence error:', err);
                }

                shortcuts.pushUndoState();
                triggerSave();
                updateStats();
                showToast(`Tagged ${tagType.toUpperCase()}: ${tagLabel}`, 'success');
            }
        });
        modal.open();
        setTimeout(() => {
            document.getElementById('modal-tag-label')?.focus();
        }, 100);
    }

    // ─── DRAFT REVISION COLOR SELECTOR ─────────────────────────────────────────
    container.querySelector('#writer-revision-select')?.addEventListener('change', async (e) => {
        const color = e.target.value;
        ['white', 'blue', 'pink', 'yellow', 'green', 'goldenrod'].forEach(c => {
            writerContainer.classList.remove(`revision-draft-${c}`);
        });
        writerContainer.classList.add(`revision-draft-${color}`);
        await screenplays.update(screenplay.id, { revisionColor: color });
        showToast(`Switched draft to ${color.toUpperCase()} Revision`, 'success');
    });

    // ─── TITLE PAGE EDITOR MODAL ───────────────────────────────────────────────
    container.querySelector('#writer-title-page-btn')?.addEventListener('click', () => {
        openTitlePageModal();
    });

    function openTitlePageModal() {
        const modal = new Modal({
            title: 'Screenplay Title Page & Cover Details',
            content: `
                <div class="title-page-form">
                    <p style="font-size:0.85rem; color:var(--app-text-muted); margin-bottom:1rem;">
                        Configures standard cover page metadata for industry export, festival submissions, and PDF distribution.
                    </p>
                    <div class="form-group">
                        <label class="form-label">Script Title</label>
                        <input type="text" id="tp-title" class="form-input" value="${escapeHtml(screenplay.title || project.name)}" required />
                    </div>
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Written By</label>
                            <input type="text" id="tp-author" class="form-input" value="${escapeHtml(screenplay.author || project.author || 'Screenwriter')}" />
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Draft / Revision</label>
                            <input type="text" id="tp-draft" class="form-input" value="${escapeHtml(screenplay.draftVersion || 'First Draft')}" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Source Material / Based On (Optional)</label>
                        <input type="text" id="tp-source" class="form-input" value="${escapeHtml(screenplay.sourceMaterial || '')}" placeholder="e.g. Based on the novel by..." />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contact / Agency / Management</label>
                        <textarea id="tp-contact" class="form-textarea" rows="3" placeholder="Agency, Manager, Legal, Phone & Email...">${escapeHtml(screenplay.contact || '')}</textarea>
                    </div>
                </div>
            `,
            confirmText: 'Save Title Page',
            onConfirm: async () => {
                const titleVal = document.getElementById('tp-title').value.trim() || screenplay.title;
                const authorVal = document.getElementById('tp-author').value.trim() || 'Screenwriter';
                const draftVal = document.getElementById('tp-draft').value.trim() || 'First Draft';
                const sourceVal = document.getElementById('tp-source').value.trim();
                const contactVal = document.getElementById('tp-contact').value.trim();

                await screenplays.update(screenplay.id, {
                    title: titleVal,
                    author: authorVal,
                    draftVersion: draftVal,
                    sourceMaterial: sourceVal,
                    contact: contactVal
                });

                screenplay.title = titleVal;
                screenplay.author = authorVal;
                screenplay.draftVersion = draftVal;
                screenplay.sourceMaterial = sourceVal;
                screenplay.contact = contactVal;

                showToast('Title Page metadata updated!', 'success');
            }
        });
        modal.open();
    }

    // ─── EXPORT STUDIO MODAL ───────────────────────────────────────────────────
    function openExportModal() {
        const modal = new Modal({
            title: 'Production Export Studio & PDF Dispatch',
            content: `
                <div class="export-studio-content">
                    <p style="font-size:0.85rem; color:var(--app-text-muted); margin-bottom:1.25rem;">
                        Export industry-compliant production assets. Generates clean 12pt Courier Prime typography, Title Page, and margin scene numbers.
                    </p>

                    <div style="background:var(--app-surface-active); border:1px solid var(--app-border); border-radius:8px; padding:1rem; margin-bottom:1.5rem;">
                        <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; color:var(--cine-yellow);">Standard Screenplay PDF</h4>
                        <div style="display:flex; flex-direction:column; gap:0.6rem; font-size:0.85rem;">
                            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                <input type="checkbox" id="exp-opt-titlepage" checked />
                                <span>Include Title Page (Cover Sheet)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                <input type="checkbox" id="exp-opt-scenenums" ${areSceneNumbersActive ? 'checked' : ''} />
                                <span>Include Margin Scene Numbers</span>
                            </label>
                            <div style="display:flex; gap:0.75rem; align-items:center; margin-top:0.35rem;">
                                <span>Draft Watermark:</span>
                                <select id="exp-opt-watermark" class="form-select" style="padding:2px 8px; width:auto;">
                                    <option value="">None (Clean)</option>
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                                    <option value="FINAL DRAFT">FINAL DRAFT</option>
                                    <option value="REVISION">REVISION</option>
                                </select>
                            </div>
                        </div>
                        <button id="exp-trigger-pdf-btn" class="btn primary" style="margin-top:1rem; width:100%;">
                            Print / Generate Screenplay PDF
                        </button>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.75rem;">
                        <button id="exp-trigger-fdx-btn" class="btn secondary" style="flex-direction:column; padding:0.85rem 0.5rem; gap:0.3rem;">
                            <strong style="color:var(--cine-cyan);">Final Draft (.fdx)</strong>
                            <span style="font-size:0.7rem; color:var(--app-text-muted);">FD 11/12/13 Compatible</span>
                        </button>
                        <button id="exp-trigger-fountain-btn" class="btn secondary" style="flex-direction:column; padding:0.85rem 0.5rem; gap:0.3rem;">
                            <strong style="color:var(--cine-violet);">Fountain (.fountain)</strong>
                            <span style="font-size:0.7rem; color:var(--app-text-muted);">Clean Plaintext Script</span>
                        </button>
                        <button id="exp-trigger-txt-btn" class="btn secondary" style="flex-direction:column; padding:0.85rem 0.5rem; gap:0.3rem;">
                            <strong style="color:var(--cine-magenta);">Text (.txt)</strong>
                            <span style="font-size:0.7rem; color:var(--app-text-muted);">Standard Text</span>
                        </button>
                    </div>
                </div>
            `,
            cancelText: 'Close'
        });
        modal.open();

        document.getElementById('exp-trigger-pdf-btn')?.addEventListener('click', () => {
            modal.close();
            const includeTitlePage = document.getElementById('exp-opt-titlepage')?.checked ?? true;
            const showSceneNumbers = document.getElementById('exp-opt-scenenums')?.checked ?? false;
            const watermark = document.getElementById('exp-opt-watermark')?.value || '';

            printScreenplayPDF(editor, screenplay, project, {
                includeTitlePage,
                showSceneNumbers,
                watermark,
                revisionColor: screenplay.revisionColor || 'white'
            });
        });

        document.getElementById('exp-trigger-fdx-btn')?.addEventListener('click', () => {
            modal.close();
            const fdxContent = generateFDX(editor, screenplay, project);
            downloadFile(fdxContent, `${screenplay.title || 'screenplay'}.fdx`, 'application/xml');
            showToast('Final Draft (.fdx) script downloaded!', 'success');
        });

        document.getElementById('exp-trigger-fountain-btn')?.addEventListener('click', () => {
            modal.close();
            const fountainContent = generateFountain(editor, screenplay, project);
            downloadFile(fountainContent, `${screenplay.title || 'screenplay'}.fountain`, 'text/plain');
            showToast('Fountain script downloaded!', 'success');
        });

        document.getElementById('exp-trigger-txt-btn')?.addEventListener('click', () => {
            modal.close();
            const fountainContent = generateFountain(editor, screenplay, project);
            downloadFile(fountainContent, `${screenplay.title || 'screenplay'}.txt`, 'text/plain');
            showToast('Plain text script downloaded!', 'success');
        });
    }

    container.querySelector('#writer-export-btn')?.addEventListener('click', openExportModal);

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 150);
    }

    // ─── FILE IMPORTER ─────────────────────────────────────────────────────────
    const fileInput = container.querySelector('#writer-import-file-input');
    container.querySelector('#writer-import-btn')?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        confirmDialog(
            'Import Screenplay File',
            `Importing "${file.name}" will convert it into semantic screenplay blocks and update the current draft. Any unsaved changes will be replaced. Continue?`,
            async () => {
                try {
                    const parsed = await parseAndImportFile(file);
                    editor.innerHTML = '';
                    parsed.blocks.forEach(b => {
                        const block = createBlock(b.type, b.text);
                        editor.appendChild(block);
                    });
                    sanitizeDOM(editor);
                    shortcuts.pushUndoState();
                    triggerSave(true);
                    updateStats();
                    updateFormatUI();
                    showToast(`Successfully imported ${file.name}!`, 'success');
                } catch (err) {
                    console.error('Import error:', err);
                    showToast(`Failed to parse file: ${err.message}`, 'error');
                } finally {
                    fileInput.value = '';
                }
            },
            () => { fileInput.value = ''; }
        );
    });

    // ─── SCRIPT ANALYTICS & DIAGNOSTICS MODAL ──────────────────────────────────
    container.querySelector('#writer-footer-bar')?.addEventListener('click', () => {
        openDiagnosticsModal();
    });

    function openDiagnosticsModal() {
        const blocks = extractEditorBlocks(editor);
        let dialogueWords = 0;
        let actionWords = 0;
        let intScenes = 0;
        let extScenes = 0;
        let dayScenes = 0;
        let nightScenes = 0;

        const charWordsMap = new Map();
        const charLinesMap = new Map();
        let lastChar = null;

        const healthIssues = [];

        blocks.forEach((b, idx) => {
            const text = b.text.trim();
            const words = text.split(/\s+/).filter(w => w.length > 0).length;

            if (b.type === 'dialogue') {
                dialogueWords += words;
                if (lastChar) {
                    charWordsMap.set(lastChar, (charWordsMap.get(lastChar) || 0) + words);
                    charLinesMap.set(lastChar, (charLinesMap.get(lastChar) || 0) + 1);
                } else {
                    healthIssues.push(`Block #${idx + 1}: Dialogue without preceding character cue.`);
                }
            } else if (b.type === 'action') {
                actionWords += words;
                lastChar = null;
            } else if (b.type === 'character') {
                lastChar = text.replace(/\(.*\)/g, '').trim().toUpperCase();
            } else if (b.type === 'scene-heading') {
                lastChar = null;
                const upper = text.toUpperCase();
                if (upper.startsWith('INT.')) intScenes++;
                else if (upper.startsWith('EXT.')) extScenes++;

                if (upper.includes('NIGHT')) nightScenes++;
                else dayScenes++;
            }
        });

        const totalWords = dialogueWords + actionWords || 1;
        const dialPct = Math.round((dialogueWords / totalWords) * 100);
        const actPct = 100 - dialPct;

        const sortedChars = Array.from(charWordsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const stats = computeAccurateStats(editor);

        const modal = new Modal({
            title: 'Screenplay Analytics & Health Diagnostics',
            content: `
                <div class="analytics-modal-content">
                    <!-- Top Metric Cards -->
                    <div class="stats-modal-grid">
                        <div class="stats-modal-card">
                            <div class="stats-modal-val">${stats.pages}</div>
                            <div class="stats-modal-lbl">Estimated Pages (1/8ths)</div>
                        </div>
                        <div class="stats-modal-card">
                            <div class="stats-modal-val">~${stats.readingMinutes} min</div>
                            <div class="stats-modal-lbl">Estimated Screen Time</div>
                        </div>
                        <div class="stats-modal-card">
                            <div class="stats-modal-val">${stats.scenes}</div>
                            <div class="stats-modal-lbl">Total Scenes</div>
                        </div>
                        <div class="stats-modal-card">
                            <div class="stats-modal-val">${stats.words.toLocaleString()}</div>
                            <div class="stats-modal-lbl">Total Spoken & Action Words</div>
                        </div>
                    </div>

                    <!-- Dialogue vs Action Ratio -->
                    <div style="margin-bottom:1.5rem;">
                        <h4 style="margin:0 0 0.4rem 0; font-size:0.9rem; color:var(--app-text);">Dialogue vs. Action Balance</h4>
                        <div class="ratio-bar">
                            <div class="ratio-fill-dialogue" style="width:${dialPct}%;"></div>
                            <div class="ratio-fill-action" style="width:${actPct}%;"></div>
                        </div>
                        <div class="ratio-labels">
                            <span>💬 Dialogue: <strong>${dialPct}%</strong> (${dialogueWords.toLocaleString()} words)</span>
                            <span>🎬 Action: <strong>${actPct}%</strong> (${actionWords.toLocaleString()} words)</span>
                        </div>
                    </div>

                    <!-- Top Speaking Characters -->
                    <div style="margin-bottom:1.5rem;">
                        <h4 style="margin:0 0 0.5rem 0; font-size:0.9rem; color:var(--app-text);">Top Speaking Roles</h4>
                        ${sortedChars.length === 0 ? '<p style="color:var(--app-text-muted); font-size:0.8rem;">No dialogue found yet.</p>' : `
                            <div style="display:flex; flex-direction:column; gap:0.4rem;">
                                ${sortedChars.map(([name, words]) => `
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.4rem 0.75rem; border-radius:4px; font-size:0.82rem;">
                                        <span style="font-weight:700; color:var(--cine-yellow);">${name}</span>
                                        <span style="color:var(--app-text-muted);">${words.toLocaleString()} words • ${charLinesMap.get(name) || 0} speeches</span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Environmental Breakdown -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem; font-size:0.82rem;">
                        <div style="background:rgba(255,255,255,0.02); padding:0.5rem 0.75rem; border-radius:6px; border:1px solid var(--app-border);">
                            <span style="color:var(--app-text-muted);">Settings:</span>
                            <strong style="color:var(--cine-cyan); margin-left:0.5rem;">${intScenes} INT / ${extScenes} EXT</strong>
                        </div>
                        <div style="background:rgba(255,255,255,0.02); padding:0.5rem 0.75rem; border-radius:6px; border:1px solid var(--app-border);">
                            <span style="color:var(--app-text-muted);">Time of Day:</span>
                            <strong style="color:var(--cine-violet); margin-left:0.5rem;">${dayScenes} DAY / ${nightScenes} NIGHT</strong>
                        </div>
                    </div>

                    <!-- Health Diagnostics -->
                    <div>
                        <h4 style="margin:0 0 0.4rem 0; font-size:0.9rem; color:var(--app-text);">Formatting Health Check</h4>
                        ${healthIssues.length === 0 ? `
                            <p style="color:var(--cine-lime); font-size:0.82rem; margin:0;">✓ Clean formatting! All dialogue cues, sluglines, and transitions are correctly structured.</p>
                        ` : `
                            <div style="background:rgba(255,90,95,0.08); border-left:3px solid var(--cine-coral); padding:0.5rem 0.75rem; font-size:0.8rem; color:#ff8b8f;">
                                ${healthIssues.slice(0, 4).map(h => `<div>⚠️ ${h}</div>`).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `,
            cancelText: 'Done'
        });
        modal.open();
    }

    // ─── FIND & REPLACE ────────────────────────────────────────────────────────
    function toggleFindReplace() {
        findReplaceBar.classList.toggle('hidden');
        if (!findReplaceBar.classList.contains('hidden')) {
            findInput.focus();
            findInput.select();
            performFind();
        }
    }

    findBtn?.addEventListener('click', toggleFindReplace);
    container.querySelector('#find-close-btn')?.addEventListener('click', () => {
        findReplaceBar.classList.add('hidden');
        clearFindHighlights();
        editor.focus();
    });

    let currentMatchIndex = 0;
    let matchNodes = [];

    function clearFindHighlights() {
        editor.querySelectorAll('.find-highlight').forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
        matchNodes = [];
        if (findCount) findCount.textContent = '0 of 0';
    }

    function performFind() {
        clearFindHighlights();
        const term = findInput.value;
        if (!term) return;

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.parentElement && !node.parentElement.classList.contains('script-tag')) {
                textNodes.push(node);
            }
        }

        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

        textNodes.forEach(tNode => {
            const matches = [...tNode.nodeValue.matchAll(regex)];
            if (matches.length > 0) {
                const frag = document.createDocumentFragment();
                let lastIdx = 0;
                matches.forEach(m => {
                    const matchStart = m.index;
                    const matchEnd = matchStart + m[0].length;

                    if (matchStart > lastIdx) {
                        frag.appendChild(document.createTextNode(tNode.nodeValue.slice(lastIdx, matchStart)));
                    }

                    const span = document.createElement('span');
                    span.className = 'find-highlight';
                    span.textContent = m[0];
                    frag.appendChild(span);
                    matchNodes.push(span);

                    lastIdx = matchEnd;
                });

                if (lastIdx < tNode.nodeValue.length) {
                    frag.appendChild(document.createTextNode(tNode.nodeValue.slice(lastIdx)));
                }

                tNode.parentNode.replaceChild(frag, tNode);
            }
        });

        if (matchNodes.length > 0) {
            currentMatchIndex = 0;
            highlightActiveMatch();
        } else {
            if (findCount) findCount.textContent = '0 of 0';
        }
    }

    function highlightActiveMatch() {
        matchNodes.forEach((n, idx) => {
            n.classList.toggle('active-match', idx === currentMatchIndex);
        });
        if (matchNodes[currentMatchIndex]) {
            matchNodes[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (findCount) findCount.textContent = `${currentMatchIndex + 1} of ${matchNodes.length}`;
        }
    }

    findInput?.addEventListener('input', performFind);

    container.querySelector('#find-next-btn')?.addEventListener('click', () => {
        if (matchNodes.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % matchNodes.length;
        highlightActiveMatch();
    });

    container.querySelector('#find-prev-btn')?.addEventListener('click', () => {
        if (matchNodes.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + matchNodes.length) % matchNodes.length;
        highlightActiveMatch();
    });

    container.querySelector('#find-replace-btn')?.addEventListener('click', () => {
        if (matchNodes[currentMatchIndex]) {
            const rep = replaceInput.value || '';
            const active = matchNodes[currentMatchIndex];
            const textNode = document.createTextNode(rep);
            active.parentNode.replaceChild(textNode, active);
            matchNodes.splice(currentMatchIndex, 1);
            if (currentMatchIndex >= matchNodes.length) currentMatchIndex = 0;
            highlightActiveMatch();
            triggerSave();
            updateStats();
        }
    });

    container.querySelector('#find-replace-all-btn')?.addEventListener('click', () => {
        const rep = replaceInput.value || '';
        matchNodes.forEach(span => {
            const textNode = document.createTextNode(rep);
            span.parentNode.replaceChild(textNode, span);
        });
        clearFindHighlights();
        triggerSave();
        updateStats();
        showToast('All occurrences replaced', 'success');
    });

    // ─── CONTEXT SIDEBAR & SCENE NAVIGATOR ──────────────────────────────────────
    toggleSidebarBtn?.addEventListener('click', () => {
        contextSidebar?.classList.toggle('hidden');
        if (!contextSidebar?.classList.contains('hidden')) {
            renderContextSidebar();
        }
    });

    let sceneFilterQuery = '';
    container.querySelector('#ctx-scene-search')?.addEventListener('input', (e) => {
        sceneFilterQuery = (e.target.value || '').toUpperCase().trim();
        renderContextSidebar();
    });

    async function renderContextSidebar() {
        if (!contextSidebar || contextSidebar.classList.contains('hidden')) return;

        const currentBlock = getCurrentBlock(editor);
        let activeHeading = 'INT. SCENE START - DAY';

        if (currentBlock) {
            let cursor = currentBlock;
            while (cursor) {
                if (cursor.getAttribute('data-type') === 'scene-heading') {
                    activeHeading = cursor.textContent.trim();
                    break;
                }
                cursor = cursor.previousElementSibling;
            }
        }

        const projectScenes = await scenes.getByScreenplay(screenplay.id);
        const activeScene = projectScenes.find(s => s.heading.toUpperCase().trim() === activeHeading.toUpperCase().trim()) || projectScenes[0];

        const sceneBadge = container.querySelector('#ctx-scene-badge');
        const sceneTitle = container.querySelector('#ctx-scene-title');
        const sceneMeta = container.querySelector('#ctx-scene-meta');
        const quickLinks = container.querySelector('#ctx-quick-links');
        const charsList = container.querySelector('#ctx-chars-list');
        const charsCount = container.querySelector('#ctx-chars-count');
        const locBox = container.querySelector('#ctx-location-box');
        const scenesNav = container.querySelector('#ctx-scenes-nav');
        const scenesCountBadge = container.querySelector('#ctx-scenes-count');

        if (scenesCountBadge) scenesCountBadge.textContent = projectScenes.length;

        if (activeScene) {
            if (sceneBadge) sceneBadge.textContent = `SCENE ${activeScene.sceneNumber}`;
            if (sceneTitle) sceneTitle.textContent = activeScene.heading;
            if (sceneMeta) sceneMeta.textContent = `${activeScene.intOrExt || 'INT.'} • ${activeScene.timeOfDay || 'DAY'}`;

            if (quickLinks) {
                quickLinks.innerHTML = `
                    <a href="#/project/${project.id}/storyboard?sceneId=${activeScene.id}" class="entity-chip entity-chip-storyboard" title="View Storyboards">
                        Storyboard
                    </a>
                    <a href="#/project/${project.id}/shots?sceneId=${activeScene.id}" class="entity-chip entity-chip-shot" title="View Shot List">
                        Shots
                    </a>
                    <a href="#/project/${project.id}/breakdown" class="entity-chip entity-chip-breakdown" title="View Breakdown">
                        Breakdown
                    </a>
                `;
            }

            const sceneCharIds = activeScene.characterIds || [];
            const linkedChars = projChars.filter(c => sceneCharIds.includes(c.id));

            if (charsCount) charsCount.textContent = linkedChars.length;
            if (charsList) {
                if (linkedChars.length === 0) {
                    charsList.innerHTML = `<span style="font-size:0.75rem; color:var(--app-text-muted); padding:0.25rem 0.5rem;">No characters tagged yet</span>`;
                } else {
                    charsList.innerHTML = linkedChars.map(c => `
                        <a href="#/project/${project.id}/characters/${c.id}" class="context-clickable-item">
                            <span>${c.name}</span>
                            <span style="font-size:0.7rem; color:var(--app-text-muted);">${c.role || 'Cast'}</span>
                        </a>
                    `).join('');
                }
            }

            if (locBox) {
                const loc = projLocs.find(l => l.id === activeScene.locationId);
                if (loc) {
                    locBox.innerHTML = `
                        <a href="#/project/${project.id}/locations/${loc.id}" class="context-clickable-item" style="padding:0;">
                            <strong>${loc.name}</strong>
                            <span style="font-size:0.7rem; color:var(--cine-cyan);">&rarr;</span>
                        </a>
                    `;
                } else {
                    locBox.innerHTML = `<span style="font-size:0.75rem; color:var(--app-text-muted);">${activeScene.heading} (auto-linked)</span>`;
                }
            }
        }

        if (scenesNav) {
            const filteredScenes = sceneFilterQuery
                ? projectScenes.filter(s => s.heading.toUpperCase().includes(sceneFilterQuery))
                : projectScenes;

            scenesNav.innerHTML = filteredScenes.map((s, idx) => `
                <div class="context-clickable-item" data-scene-heading="${s.heading}" style="font-size:0.75rem; display:flex; justify-content:space-between; align-items:center; ${s.id === activeScene?.id ? 'background:var(--app-surface-hover); font-weight:700;' : ''}">
                    <div style="display:flex; align-items:center; min-width:0; flex:1;">
                        <span style="color:var(--cine-yellow); font-weight:800; margin-right:0.35rem; flex-shrink:0;">#${s.sceneNumber}</span>
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.heading}</span>
                    </div>
                    <div class="scene-reorder-btns" style="display:flex; gap:2px; margin-left:4px;">
                        <button class="scene-move-btn" data-dir="up" data-scene="${s.heading}" title="Move Scene Up" ${idx === 0 ? 'disabled' : ''} style="background:none; border:none; color:var(--app-text-muted); cursor:pointer; padding:1px 3px;">▲</button>
                        <button class="scene-move-btn" data-dir="down" data-scene="${s.heading}" title="Move Scene Down" ${idx === filteredScenes.length - 1 ? 'disabled' : ''} style="background:none; border:none; color:var(--app-text-muted); cursor:pointer; padding:1px 3px;">▼</button>
                    </div>
                </div>
            `).join('');

            scenesNav.querySelectorAll('.context-clickable-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.classList.contains('scene-move-btn')) return;
                    const headingText = item.getAttribute('data-scene-heading');
                    jumpToSceneHeading(headingText);
                });
            });

            // Scene Reorder click handlers
            scenesNav.querySelectorAll('.scene-move-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dir = btn.getAttribute('data-dir');
                    const heading = btn.getAttribute('data-scene');
                    moveSceneBlock(heading, dir);
                });
            });
        }
    }

    function jumpToSceneHeading(headingText) {
        const allBlocks = editor.querySelectorAll('.script-block');
        for (const b of allBlocks) {
            if (b.textContent.trim().toUpperCase() === headingText.trim().toUpperCase()) {
                b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setCaretToEnd(b);
                updateFormatUI();
                renderContextSidebar();
                break;
            }
        }
    }

    function moveSceneBlock(headingText, direction) {
        const blocks = Array.from(editor.children);
        let sceneStartIndex = -1;
        let sceneEndIndex = -1;

        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].getAttribute('data-type') === 'scene-heading' && blocks[i].textContent.trim().toUpperCase() === headingText.trim().toUpperCase()) {
                sceneStartIndex = i;
                break;
            }
        }

        if (sceneStartIndex === -1) return;

        // Scene ends at the block before the next scene-heading, or end of editor
        sceneEndIndex = blocks.length - 1;
        for (let i = sceneStartIndex + 1; i < blocks.length; i++) {
            if (blocks[i].getAttribute('data-type') === 'scene-heading') {
                sceneEndIndex = i - 1;
                break;
            }
        }

        const sceneBlocks = blocks.slice(sceneStartIndex, sceneEndIndex + 1);

        if (direction === 'up') {
            // Find start of previous scene
            let prevSceneStart = -1;
            for (let i = sceneStartIndex - 1; i >= 0; i--) {
                if (blocks[i].getAttribute('data-type') === 'scene-heading') {
                    prevSceneStart = i;
                    break;
                }
            }
            if (prevSceneStart !== -1) {
                const targetNode = blocks[prevSceneStart];
                sceneBlocks.forEach(b => editor.insertBefore(b, targetNode));
            }
        } else if (direction === 'down') {
            // Find start of next scene after this one
            const nextSceneStart = sceneEndIndex + 1;
            if (nextSceneStart < blocks.length) {
                let nextSceneEnd = blocks.length - 1;
                for (let i = nextSceneStart + 1; i < blocks.length; i++) {
                    if (blocks[i].getAttribute('data-type') === 'scene-heading') {
                        nextSceneEnd = i - 1;
                        break;
                    }
                }
                const insertAfterNode = blocks[nextSceneEnd];
                if (insertAfterNode && insertAfterNode.nextSibling) {
                    sceneBlocks.forEach(b => editor.insertBefore(b, insertAfterNode.nextSibling));
                } else {
                    sceneBlocks.forEach(b => editor.appendChild(b));
                }
            }
        }

        shortcuts.pushUndoState();
        triggerSave(true);
        jumpToSceneHeading(headingText);
        showToast(`Scene shifted ${direction}!`, 'success');
    }

    // Auto-save logic
    let saveTimeout = null;
    async function triggerSave(forceSnapshot = false) {
        if (saveIndicator) {
            saveIndicator.textContent = 'Saving...';
            saveIndicator.className = 'save-indicator saving';
        }

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const rawContent = generateFountain(editor, screenplay, project);
            const htmlContent = editor.innerHTML;
            const stats = computeAccurateStats(editor);

            await screenplays.update(screenplay.id, {
                content: rawContent,
                htmlContent,
                wordCount: stats.words,
                sceneCount: stats.scenes,
                entityData: entityDictionary.serialize()
            });

            // Synchronize with stable scene records
            try {
                await syncScreenplayScenes(project.id, screenplay.id, rawContent);
                renderContextSidebar();
            } catch (err) {
                console.warn('Scene sync error:', err);
            }

            if (forceSnapshot) {
                await versions.create({
                    screenplayId: screenplay.id,
                    title: `Manual snapshot — ${new Date().toLocaleTimeString()}`,
                    wordCount: stats.words,
                    sceneCount: stats.scenes,
                    content: rawContent
                });
            }

            if (saveIndicator) {
                saveIndicator.textContent = 'Saved';
                saveIndicator.className = 'save-indicator saved';
            }
        }, forceSnapshot ? 0 : 800);
    }

    function updateStats() {
        const stats = computeAccurateStats(editor);

        const pagesEl = container.querySelector('#stat-pages');
        const wordsEl = container.querySelector('#stat-words');
        const charsEl = container.querySelector('#stat-chars');
        const parasEl = container.querySelector('#stat-paras');
        const scenesEl = container.querySelector('#stat-scenes');
        const tagsEl = container.querySelector('#stat-tags');
        const readEl = container.querySelector('#stat-read-time');

        if (pagesEl) pagesEl.textContent = `Page ${stats.pages} est.`;
        if (wordsEl) wordsEl.textContent = `${stats.words.toLocaleString()} words`;
        if (charsEl) charsEl.textContent = `${stats.characters.toLocaleString()} chars`;
        if (parasEl) parasEl.textContent = `${stats.paragraphs} blocks`;
        if (scenesEl) scenesEl.textContent = `${stats.scenes} scene${stats.scenes === 1 ? '' : 's'}`;
        if (tagsEl) tagsEl.textContent = `${stats.tags} tag${stats.tags === 1 ? '' : 's'}`;
        if (readEl) readEl.textContent = `~${stats.readingMinutes} min read`;

        pagination.update();
    }

    // Keystroke listeners on editor
    editor.addEventListener('keydown', (e) => {
        if (autocomplete.isActive && autocomplete.handleKeyDown(e)) {
            return;
        }

        if (shortcuts.handleKeyDown(e)) {
            return;
        }

        const block = getCurrentBlock(editor);

        if (e.key === 'Enter') {
            e.preventDefault();
            if (handleEnter(block)) {
                updateFormatUI();
                shortcuts.pushUndoState();
                triggerSave();
                updateStats();
                applyTypewriterScroll();
                renderContextSidebar();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (handleTab(block, e.shiftKey)) {
                updateFormatUI();
                shortcuts.pushUndoState();
                triggerSave();
            }
        } else if (e.key === 'Backspace') {
            if (handleBackspace(block)) {
                e.preventDefault();
                updateFormatUI();
                shortcuts.pushUndoState();
                triggerSave();
                updateStats();
                applyTypewriterScroll();
                renderContextSidebar();
            }
        }
    });

    editor.addEventListener('input', () => {
        const block = getCurrentBlock(editor);
        if (block) {
            checkAutoRecognition(block);
            autocomplete.check(block);
        }
        updateFormatUI();
        triggerSave();
        updateStats();
        applyTypewriterScroll();
    });

    editor.addEventListener('click', () => {
        updateFormatUI();
        autocomplete.hide();
        renderContextSidebar();
    });

    editor.addEventListener('keyup', () => {
        updateFormatUI();
        renderContextSidebar();
        applyTypewriterScroll();
    });

    // Top action buttons
    container.querySelector('#writer-undo-btn')?.addEventListener('click', () => {
        shortcuts.undo();
        updateFormatUI();
    });

    container.querySelector('#writer-redo-btn')?.addEventListener('click', () => {
        shortcuts.redo();
        updateFormatUI();
    });

    // Initial stats computation
    updateStats();
    updateFormatUI();
}

function populateEditor(editor, content) {
    editor.innerHTML = '';
    if (!content || !content.trim()) {
        const initial = createBlock('scene-heading', 'INT. SCENE START - DAY');
        editor.appendChild(initial);
        return;
    }

    const lines = content.split(/\r?\n/);
    let prevType = 'scene-heading';

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        let type = 'action';
        const upper = line.toUpperCase();

        if (upper.startsWith('TITLE:')) {
            type = 'title-header';
        } else if (upper.startsWith('AUTHOR:') || upper.startsWith('BY:')) {
            type = 'author-header';
        } else if (upper.startsWith('INT.') || upper.startsWith('EXT.') || upper.startsWith('INT/EXT.') || upper.startsWith('I/E.') || upper.startsWith('EST.')) {
            type = 'scene-heading';
        } else if (upper.endsWith('TO:') || upper === 'FADE OUT.' || upper === 'FADE IN:') {
            type = 'transition';
        } else if (line.startsWith('(') && line.endsWith(')')) {
            type = 'parenthetical';
        } else if (line.startsWith('[[') && line.endsWith(']]')) {
            type = 'script-note';
            line = line.slice(2, -2).trim();
        } else if (/^[A-Z0-9\s\.\(\)\_'\-]{2,35}$/.test(line) && prevType !== 'character' && !upper.startsWith('EXT.') && !upper.startsWith('INT.')) {
            type = 'character';
        } else if (prevType === 'character' || prevType === 'parenthetical') {
            type = 'dialogue';
        }

        const block = createBlock(type, line);
        editor.appendChild(block);
        prevType = type;
    }

    if (editor.children.length === 0) {
        editor.appendChild(createBlock('scene-heading', 'INT. SCENE START - DAY'));
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
