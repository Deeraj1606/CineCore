/**
 * sidebar.js — Context-Aware Global Sidebar for CINECORE
 * Uses clean SVG icons, accessible markup, and smooth transitions.
 */

import { appState } from '../state.js';
import { router } from '../router.js';

const PROJECT_TYPE_LABELS = {
    'film': 'Feature Film',
    'short': 'Short Film',
    'web-series': 'Web Series',
    'tv-series': 'TV Series',
    'custom': 'Custom'
};

// SVG Icon set — clean, minimal, consistent stroke-width=1.75
const ICONS = {
    home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    overview: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    writer: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    analysis: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    scenes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    story: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    storyboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>`,
    shots: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`,
    moodboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    breakdown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    schedule: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    callsheet: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    tasks: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    characters: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    locations: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    seasons: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    backArrow: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    recent: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    pinned: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
};

function navItem(icon, label, href, isActive, key) {
    return `<a href="#${href}" class="nav-item ${isActive ? 'active' : ''}" data-nav="${key}" title="${label}" aria-current="${isActive ? 'page' : 'false'}">
        <span class="nav-icon" aria-hidden="true">${icon}</span>
        <span class="nav-label">${label}</span>
    </a>`;
}

function navSection(title, items) {
    return `<div class="nav-section">
        <div class="nav-section-title">${title}</div>
        ${items}
    </div>`;
}

/** Build the home-level sidebar navigation */
function homeNav() {
    const path = router.path;
    return `
        <div class="sidebar-brand-home">
            <span class="sidebar-brand-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="7" fill="#713BFF"/><rect x="5" y="8" width="9" height="9" rx="2" fill="#FF38B8"/><rect x="18" y="8" width="9" height="9" rx="2" fill="#00E5FF"/><rect x="5" y="19" width="9" height="9" rx="2" fill="#FFD629"/><rect x="18" y="19" width="9" height="9" rx="2" fill="#B9FF39"/></svg>
            </span>
            <div class="sidebar-brand-labels">
                <span class="sidebar-brand-name">CINECORE</span>
                <span class="sidebar-brand-tagline">Filmmaking OS</span>
            </div>
        </div>
        <nav class="sidebar-nav" aria-label="Main navigation">
            ${navSection('WORKSPACE', `
                ${navItem(ICONS.home, 'Home', '/', path === '/', 'home')}
                ${navItem(ICONS.plus, 'New Project', '/projects/new', path === '/projects/new', 'new-project')}
            `)}
        </nav>
    `;
}

/** Build the project-level sidebar navigation for Film/Short */
function projectNav(project) {
    const pid = project.id;
    const path = router.path;
    const isActive = (href) => {
        if (href === `/project/${pid}`) return path === href;
        return path.startsWith(href);
    };

    return `
        <div class="sidebar-project-header">
            <a href="#/" class="sidebar-back-btn" title="Back to all projects" aria-label="Back to home">
                ${ICONS.backArrow}
            </a>
            <div class="sidebar-project-info">
                <span class="sidebar-project-name" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</span>
                <span class="sidebar-project-type">${PROJECT_TYPE_LABELS[project.type || 'film'] || project.type || 'Project'}</span>
            </div>
        </div>
        <nav class="sidebar-nav" aria-label="Project navigation">
            ${navSection('CREATIVE', `
                ${navItem(ICONS.overview, 'Overview', `/project/${pid}`, isActive(`/project/${pid}`), 'overview')}
                ${navItem(ICONS.writer, 'Writer', `/project/${pid}/writer`, isActive(`/project/${pid}/writer`), 'writer')}
                ${navItem(ICONS.analysis, 'Analysis', `/project/${pid}/analysis`, isActive(`/project/${pid}/analysis`), 'analysis')}
                ${navItem(ICONS.scenes, 'Scenes', `/project/${pid}/scenes`, isActive(`/project/${pid}/scenes`), 'scenes')}
                ${navItem(ICONS.story, 'Story', `/project/${pid}/story`, isActive(`/project/${pid}/story`), 'story')}
            `)}
            ${navSection('VISUAL', `
                ${navItem(ICONS.storyboard, 'Storyboard', `/project/${pid}/storyboard`, isActive(`/project/${pid}/storyboard`), 'storyboard')}
                ${navItem(ICONS.shots, 'Shot List', `/project/${pid}/shots`, isActive(`/project/${pid}/shots`), 'shots')}
                ${navItem(ICONS.moodboard, 'Moodboard', `/project/${pid}/moodboard`, isActive(`/project/${pid}/moodboard`), 'moodboard')}
            `)}
            ${navSection('PRODUCTION', `
                ${navItem(ICONS.breakdown, 'Breakdown', `/project/${pid}/breakdown`, isActive(`/project/${pid}/breakdown`), 'breakdown')}
                ${navItem(ICONS.schedule, 'Stripboard', `/project/${pid}/schedule`, isActive(`/project/${pid}/schedule`), 'schedule')}
                ${navItem(ICONS.callsheet, 'Call Sheets', `/project/${pid}/callsheet`, isActive(`/project/${pid}/callsheet`), 'callsheet')}
                ${navItem(ICONS.tasks, 'Tasks', `/project/${pid}/tasks`, isActive(`/project/${pid}/tasks`), 'tasks')}
            `)}
            ${navSection('UNIVERSE', `
                ${navItem(ICONS.characters, 'Characters', `/project/${pid}/characters`, isActive(`/project/${pid}/characters`), 'characters')}
                ${navItem(ICONS.locations, 'Locations', `/project/${pid}/locations`, isActive(`/project/${pid}/locations`), 'locations')}
            `)}
            <div class="nav-section nav-section-bottom">
                ${navItem(ICONS.settings, 'Settings', `/project/${pid}/settings`, isActive(`/project/${pid}/settings`), 'settings')}
            </div>
        </nav>
    `;
}

/** Build the project-level sidebar navigation for Web/TV Series */
function seriesNav(project) {
    const pid = project.id;
    const path = router.path;
    const isActive = (href) => {
        if (href === `/project/${pid}`) return path === href;
        return path.startsWith(href);
    };

    return `
        <div class="sidebar-project-header">
            <a href="#/" class="sidebar-back-btn" title="Back to all projects" aria-label="Back to home">
                ${ICONS.backArrow}
            </a>
            <div class="sidebar-project-info">
                <span class="sidebar-project-name" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</span>
                <span class="sidebar-project-type">${PROJECT_TYPE_LABELS[project.type || 'tv-series'] || project.type || 'Series'}</span>
            </div>
        </div>
        <nav class="sidebar-nav" aria-label="Series navigation">
            ${navSection('SERIES', `
                ${navItem(ICONS.overview, 'Overview', `/project/${pid}`, isActive(`/project/${pid}`), 'overview')}
                ${navItem(ICONS.seasons, 'Seasons & Episodes', `/project/${pid}/seasons`, isActive(`/project/${pid}/seasons`), 'seasons')}
                ${navItem(ICONS.scenes, 'Scene Index', `/project/${pid}/scenes`, isActive(`/project/${pid}/scenes`), 'scenes')}
                ${navItem(ICONS.story, 'Series Bible', `/project/${pid}/story`, isActive(`/project/${pid}/story`), 'story')}
            `)}
            ${navSection('VISUAL', `
                ${navItem(ICONS.storyboard, 'Storyboard', `/project/${pid}/storyboard`, isActive(`/project/${pid}/storyboard`), 'storyboard')}
                ${navItem(ICONS.shots, 'Shot List', `/project/${pid}/shots`, isActive(`/project/${pid}/shots`), 'shots')}
                ${navItem(ICONS.moodboard, 'Moodboard', `/project/${pid}/moodboard`, isActive(`/project/${pid}/moodboard`), 'moodboard')}
            `)}
            ${navSection('PRODUCTION', `
                ${navItem(ICONS.breakdown, 'Breakdown', `/project/${pid}/breakdown`, isActive(`/project/${pid}/breakdown`), 'breakdown')}
                ${navItem(ICONS.schedule, 'Stripboard', `/project/${pid}/schedule`, isActive(`/project/${pid}/schedule`), 'schedule')}
                ${navItem(ICONS.callsheet, 'Call Sheets', `/project/${pid}/callsheet`, isActive(`/project/${pid}/callsheet`), 'callsheet')}
                ${navItem(ICONS.tasks, 'Tasks', `/project/${pid}/tasks`, isActive(`/project/${pid}/tasks`), 'tasks')}
            `)}
            ${navSection('UNIVERSE', `
                ${navItem(ICONS.characters, 'Characters', `/project/${pid}/characters`, isActive(`/project/${pid}/characters`), 'characters')}
                ${navItem(ICONS.locations, 'Locations', `/project/${pid}/locations`, isActive(`/project/${pid}/locations`), 'locations')}
            `)}
            <div class="nav-section nav-section-bottom">
                ${navItem(ICONS.settings, 'Settings', `/project/${pid}/settings`, isActive(`/project/${pid}/settings`), 'settings')}
            </div>
        </nav>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

/** Render or update the sidebar */
export function renderSidebar() {
    const el = document.getElementById('app-sidebar');
    if (!el) return;

    const project = appState.get('currentProject');

    if (!project) {
        el.innerHTML = homeNav();
    } else if (project.type === 'web-series' || project.type === 'tv-series') {
        el.innerHTML = seriesNav(project);
    } else {
        el.innerHTML = projectNav(project);
    }

    // Apply collapsed state
    el.classList.toggle('collapsed', !!appState.get('sidebarCollapsed'));
}

/** Initialize sidebar and listen for changes */
export function initSidebar() {
    renderSidebar();

    // Re-render when project context or route changes
    appState.on('currentProject', renderSidebar);
    window.addEventListener('routechange', renderSidebar);

    // Toggle collapse via sidebar toggle button in topbar
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#sidebar-toggle');
        if (toggleBtn) {
            const newState = !appState.get('sidebarCollapsed');
            appState.set('sidebarCollapsed', newState);
            document.getElementById('app-sidebar')?.classList.toggle('collapsed', newState);
            toggleBtn.setAttribute('aria-label', newState ? 'Expand sidebar' : 'Collapse sidebar');
        }
    });
}
