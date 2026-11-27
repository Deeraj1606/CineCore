/**
 * command-palette.js — Command Palette (Ctrl+K) & Global Navigation
 */

import { router } from '../router.js';
import { appState } from '../state.js';
import { projects, scenes, characters, locations, storyboards, shots, callSheets, tasks, moodboards } from '../store.js';

// SVG Icon Set for Command Palette
const ICONS = {
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    overview: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    writer: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    analysis: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    scenes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    storyboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>`,
    shots: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`,
    callsheet: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    tasks: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    moodboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    characters: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    locations: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    breakdown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    schedule: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    project: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`
};

let paletteEl = null;

export function initCommandPalette() {
    // Keyboard shortcut listener
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            togglePalette();
        }
    });

    appState.on('commandPaletteOpen', (isOpen) => {
        if (isOpen) openPalette();
        else closePalette();
    });
}

function openPalette() {
    if (!paletteEl) {
        paletteEl = renderPalette();
        document.body.appendChild(paletteEl);
    }

    paletteEl.classList.add('visible');
    const input = paletteEl.querySelector('.palette-input');
    if (input) {
        input.value = '';
        input.focus();
        updateResults('');
    }
}

function closePalette() {
    if (paletteEl) {
        paletteEl.classList.remove('visible');
    }
    appState.set('commandPaletteOpen', false);
}

function togglePalette() {
    if (paletteEl && paletteEl.classList.contains('visible')) {
        closePalette();
    } else {
        openPalette();
    }
}

function renderPalette() {
    const backdrop = document.createElement('div');
    backdrop.className = 'palette-backdrop';

    backdrop.innerHTML = `
        <div class="palette-container">
            <div class="palette-header">
                <span class="palette-search-icon">${ICONS.search}</span>
                <input type="text" class="palette-input" placeholder="Type a command or search projects, characters..." />
                <kbd class="palette-kbd">ESC</kbd>
            </div>
            <div class="palette-results" id="palette-results"></div>
        </div>
    `;

    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closePalette();
    });

    const input = backdrop.querySelector('.palette-input');
    input.addEventListener('input', (e) => {
        updateResults(e.target.value.trim());
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePalette();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            handleArrowKey(e.key);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            executeSelected();
        }
    });

    return backdrop;
}

let activeIndex = 0;
let currentItems = [];

async function updateResults(query) {
    const resultsContainer = document.getElementById('palette-results');
    if (!resultsContainer) return;

    const project = appState.get('currentProject');
    const allProjects = await projects.getAll();

    let items = [];

    // Global navigation
    items.push({
        type: 'action',
        icon: ICONS.home,
        title: 'Go to Home',
        category: 'Navigation',
        action: () => router.navigate('/')
    });
    items.push({
        type: 'action',
        icon: ICONS.plus,
        title: 'Create New Project',
        category: 'Navigation',
        action: () => router.navigate('/projects/new')
    });

    // If inside a project, add contextual shortcuts & entity search
    if (project) {
        items.push({
            type: 'action',
            icon: ICONS.overview,
            title: `Project Overview (${project.name})`,
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}`)
        });
        items.push({
            type: 'action',
            icon: ICONS.writer,
            title: 'Screenplay Writer',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/writer`)
        });
        items.push({
            type: 'action',
            icon: ICONS.analysis,
            title: 'Script Intelligence & Analysis',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/analysis`)
        });
        items.push({
            type: 'action',
            icon: ICONS.scenes,
            title: 'Scenes Master Hub',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/scenes`)
        });
        items.push({
            type: 'action',
            icon: ICONS.storyboard,
            title: 'Visual Storyboards',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/storyboard`)
        });
        items.push({
            type: 'action',
            icon: ICONS.shots,
            title: 'Shot List Studio',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/shots`)
        });
        items.push({
            type: 'action',
            icon: ICONS.callsheet,
            title: 'Call Sheets Dispatch',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/callsheet`)
        });
        items.push({
            type: 'action',
            icon: ICONS.tasks,
            title: 'Production Tasks Kanban',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/tasks`)
        });
        items.push({
            type: 'action',
            icon: ICONS.moodboard,
            title: 'Moodboard & Visual Aesthetics',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/moodboard`)
        });
        items.push({
            type: 'action',
            icon: ICONS.characters,
            title: 'Characters Universe',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/characters`)
        });
        items.push({
            type: 'action',
            icon: ICONS.locations,
            title: 'Locations Database',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/locations`)
        });
        items.push({
            type: 'action',
            icon: ICONS.breakdown,
            title: 'Production Breakdown',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/breakdown`)
        });
        items.push({
            type: 'action',
            icon: ICONS.schedule,
            title: 'Production Stripboard',
            category: 'Module',
            action: () => router.navigate(`/project/${project.id}/schedule`)
        });

        // Search project entities if query exists
        if (query) {
            const [
                projScenes,
                projChars,
                projLocs,
                projBoards,
                projShots,
                projTasks,
                projCallSheets
            ] = await Promise.all([
                scenes.getByProject(project.id),
                characters.getByProject(project.id),
                locations.getByProject(project.id),
                storyboards.getByProject(project.id),
                shots.getByProject(project.id),
                tasks.getByProject(project.id),
                callSheets.getByProject(project.id)
            ]);

            for (const s of projScenes) {
                items.push({
                    type: 'scene',
                    icon: ICONS.scenes,
                    title: `Scene ${s.sceneNumber}: ${s.heading}`,
                    subtitle: `${s.intOrExt || 'INT'} • ${s.timeOfDay || 'DAY'}`,
                    category: 'Scenes',
                    action: () => router.navigate(`/project/${project.id}/scenes`)
                });
            }

            for (const c of projChars) {
                items.push({
                    type: 'character',
                    icon: ICONS.characters,
                    title: c.name,
                    subtitle: c.role || 'Cast',
                    category: 'Characters',
                    action: () => router.navigate(`/project/${project.id}/characters/${c.id}`)
                });
            }

            for (const l of projLocs) {
                items.push({
                    type: 'location',
                    icon: ICONS.locations,
                    title: l.name,
                    subtitle: l.type || 'Setting',
                    category: 'Locations',
                    action: () => router.navigate(`/project/${project.id}/locations/${l.id}`)
                });
            }

            for (const sb of projBoards) {
                items.push({
                    type: 'storyboard',
                    icon: ICONS.storyboard,
                    title: `Frame ${sb.frameNumber}: ${sb.shotSize || 'Shot'} - ${sb.description || ''}`,
                    subtitle: `Aspect: ${sb.aspectRatio || '16:9'}`,
                    category: 'Storyboards',
                    action: () => router.navigate(`/project/${project.id}/storyboard?sceneId=${sb.sceneId}`)
                });
            }

            for (const sh of projShots) {
                items.push({
                    type: 'shot',
                    icon: ICONS.shots,
                    title: `Shot ${sh.shotNumber}: ${sh.type || 'Shot'} (${sh.camera || 'Cam A'})`,
                    subtitle: sh.action || '',
                    category: 'Shots',
                    action: () => router.navigate(`/project/${project.id}/shots?sceneId=${sh.sceneId}`)
                });
            }

            for (const t of projTasks) {
                items.push({
                    type: 'task',
                    icon: ICONS.tasks,
                    title: t.title,
                    subtitle: `${(t.department || 'Production').toUpperCase()} • ${t.status || 'todo'}`,
                    category: 'Tasks',
                    action: () => router.navigate(`/project/${project.id}/tasks`)
                });
            }

            for (const cs of projCallSheets) {
                items.push({
                    type: 'callsheet',
                    icon: ICONS.callsheet,
                    title: `Call Sheet #${cs.sheetNumber || 1} - ${cs.title || 'Day 1'}`,
                    subtitle: `Status: ${(cs.status || 'draft').toUpperCase()} • Call: ${cs.generalCallTime || '07:00 AM'}`,
                    category: 'Call Sheets',
                    action: () => router.navigate(`/project/${project.id}/callsheet`)
                });
            }
        }
    }

    // Add projects
    for (const p of allProjects) {
        items.push({
            type: 'project',
            icon: ICONS.project,
            title: p.name,
            subtitle: `${(p.type || 'film').toUpperCase()} • ${p.genre || 'No genre'}`,
            category: 'Projects',
            action: () => router.navigate(`/project/${p.id}`)
        });
    }

    // Filter by query
    if (query) {
        const q = query.toLowerCase();
        items = items.filter(it => 
            it.title.toLowerCase().includes(q) || 
            (it.subtitle && it.subtitle.toLowerCase().includes(q)) ||
            it.category.toLowerCase().includes(q)
        );
    }

    currentItems = items;
    activeIndex = 0;

    if (items.length === 0) {
        resultsContainer.innerHTML = `<div class="palette-empty">No results found for "${escapeHtml(query)}"</div>`;
        return;
    }

    resultsContainer.innerHTML = items.map((item, i) => `
        <div class="palette-item ${i === activeIndex ? 'active' : ''}" data-index="${i}">
            <span class="palette-item-icon">${item.icon}</span>
            <div class="palette-item-info">
                <span class="palette-item-title">${escapeHtml(item.title)}</span>
                ${item.subtitle ? `<span class="palette-item-sub">${escapeHtml(item.subtitle)}</span>` : ''}
            </div>
            <span class="palette-item-cat">${item.category}</span>
        </div>
    `).join('');

    resultsContainer.querySelectorAll('.palette-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            if (currentItems[idx]) {
                currentItems[idx].action();
                closePalette();
            }
        });
    });
}

function handleArrowKey(key) {
    const resultsContainer = document.getElementById('palette-results');
    if (!resultsContainer || currentItems.length === 0) return;

    if (key === 'ArrowDown') {
        activeIndex = (activeIndex + 1) % currentItems.length;
    } else if (key === 'ArrowUp') {
        activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
    }

    resultsContainer.querySelectorAll('.palette-item').forEach((el, i) => {
        el.classList.toggle('active', i === activeIndex);
        if (i === activeIndex) {
            el.scrollIntoView({ block: 'nearest' });
        }
    });
}

function executeSelected() {
    if (currentItems[activeIndex]) {
        currentItems[activeIndex].action();
        closePalette();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
