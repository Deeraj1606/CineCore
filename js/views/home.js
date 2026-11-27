/**
 * home.js — Home Dashboard for CINECORE
 * Displays projects with filtering, search, stats, and quick actions.
 */

import { projects } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderHome(container) {
    // Clear project context when on home
    appState.set('currentProject', null);
    renderBreadcrumb([]);

    container.innerHTML = `<div class="home-loading"><div class="loading-spinner"></div></div>`;

    const allProjects = await projects.getAll();

    const typeLabels = {
        'film': 'Feature Film',
        'short': 'Short Film',
        'web-series': 'Web Series',
        'tv-series': 'TV Series',
        'custom': 'Custom'
    };

    const typeColors = {
        'film': 'var(--cine-violet)',
        'short': 'var(--cine-cyan)',
        'web-series': 'var(--cine-magenta)',
        'tv-series': 'var(--cine-tangerine)',
        'custom': 'var(--cine-lime)'
    };

    const pinned = allProjects.filter(p => p.pinned);
    const recent = allProjects.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    container.innerHTML = `
        <div class="home-view" role="main">
            <!-- Page Header -->
            <div class="home-header">
                <div class="home-header-text">
                    <h1 class="home-title">Your Projects</h1>
                    <p class="home-subtitle">${allProjects.length === 0
                        ? 'Create your first project to start writing.'
                        : `${allProjects.length} project${allProjects.length !== 1 ? 's' : ''} in your workspace`}</p>
                </div>
                <div class="home-header-actions">
                    <a href="#/projects/new" class="btn primary btn-lg home-new-btn" id="home-new-project-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Project
                    </a>
                </div>
            </div>

            ${allProjects.length > 0 ? `
            <!-- Stats Bar -->
            <div class="home-stats-bar" role="region" aria-label="Project statistics">
                <div class="stat-pill">
                    <span class="stat-num">${allProjects.length}</span>
                    <span class="stat-lbl">Total</span>
                </div>
                <div class="stat-pill">
                    <span class="stat-num">${allProjects.filter(p => p.type === 'film' || p.type === 'short').length}</span>
                    <span class="stat-lbl">Films</span>
                </div>
                <div class="stat-pill">
                    <span class="stat-num">${allProjects.filter(p => (p.type || '').includes('series')).length}</span>
                    <span class="stat-lbl">Series</span>
                </div>
                <div class="stat-pill">
                    <span class="stat-num">${allProjects.filter(p => p.status === 'writing').length}</span>
                    <span class="stat-lbl">In Progress</span>
                </div>
                <div class="stat-pill">
                    <span class="stat-num">${pinned.length}</span>
                    <span class="stat-lbl">Pinned</span>
                </div>
            </div>

            <!-- Filter & Search Bar -->
            <div class="projects-filter-bar" role="search">
                <div class="filter-tabs" role="tablist" aria-label="Project filters">
                    <button class="filter-tab active" data-filter="all" role="tab" aria-selected="true" id="filter-all">All (${allProjects.length})</button>
                    <button class="filter-tab" data-filter="film" role="tab" aria-selected="false" id="filter-film">Films</button>
                    <button class="filter-tab" data-filter="series" role="tab" aria-selected="false" id="filter-series">Series</button>
                    ${pinned.length > 0 ? `<button class="filter-tab" data-filter="pinned" role="tab" aria-selected="false" id="filter-pinned">Pinned</button>` : ''}
                </div>
                <div class="filter-search-wrap">
                    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="project-search-input" class="search-input" placeholder="Search projects…" aria-label="Search projects" autocomplete="off" />
                </div>
            </div>
            ` : ''}

            <!-- Projects Grid or Empty State -->
            <div id="projects-grid-container" role="region" aria-label="Project list">
                ${allProjects.length === 0 ? renderEmptyState() : renderProjectsGrid(allProjects, typeLabels, typeColors)}
            </div>
        </div>
    `;

    // Bind events
    if (allProjects.length > 0) {
        bindHomeEvents(container, allProjects, typeLabels, typeColors);
    }
}

function renderEmptyState() {
    return `
        <div class="empty-state-card" role="status">
            <div class="empty-state-visual" aria-hidden="true">
                <div class="empty-state-circles">
                    <div class="es-circle es-c1"></div>
                    <div class="es-circle es-c2"></div>
                    <div class="es-circle es-c3"></div>
                </div>
                <div class="empty-state-icon-wrap">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--cine-violet);"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </div>
            </div>
            <h2 class="empty-state-title">No projects yet</h2>
            <p class="empty-state-body">Start your cinematic journey. Create a feature film, series, or documentary project to organize your screenplays, characters, locations, and production.</p>
            <div class="empty-state-actions">
                <a href="#/projects/new" class="btn primary btn-lg" id="empty-new-project-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Create First Project
                </a>
            </div>
        </div>
    `;
}

function renderProjectsGrid(list, typeLabels, typeColors) {
    if (list.length === 0) {
        return `
            <div class="empty-filter-state" role="status">
                <p>No projects match your search or filter.</p>
                <button class="btn secondary small" onclick="document.getElementById('project-search-input').value=''; document.querySelectorAll('.filter-tab')[0].click();">Clear Filter</button>
            </div>
        `;
    }

    return `
        <div class="projects-grid" role="list">
            ${list.map(p => {
                const color = p.coverColor || typeColors[p.type || 'film'] || 'var(--cine-violet)';
                const typeLabel = typeLabels[p.type || 'film'] || p.type || 'Project';
                const statusText = (p.status || 'development').replace(/_/g, ' ');
                return `
                <div class="project-card" data-id="${p.id}" data-type="${p.type || 'film'}" data-pinned="${p.pinned ? 'true' : 'false'}" role="listitem" tabindex="0" aria-label="${escapeHtml(p.name)} — ${typeLabel}">
                    <div class="card-color-bar" style="background: ${color};" aria-hidden="true"></div>
                    <div class="card-body">
                        <div class="card-top-row">
                            <span class="project-type-badge">${typeLabel}</span>
                            <div class="card-controls" role="group" aria-label="Project options for ${escapeHtml(p.name)}">
                                <button class="card-pin-btn ${p.pinned ? 'is-pinned' : ''}" data-pin="${p.id}" title="${p.pinned ? 'Unpin project' : 'Pin to top'}" aria-label="${p.pinned ? 'Unpin' : 'Pin'} ${escapeHtml(p.name)}" aria-pressed="${p.pinned ? 'true' : 'false'}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${p.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                </button>
                                <button class="card-more-btn" data-menu="${p.id}" title="More options" aria-label="More options for ${escapeHtml(p.name)}" aria-haspopup="true" aria-expanded="false">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                </button>
                                <div class="card-dropdown hidden" id="card-menu-${p.id}" role="menu" aria-label="Options for ${escapeHtml(p.name)}">
                                    <button class="dropdown-item" data-action="open" data-id="${p.id}" role="menuitem">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        Open Project
                                    </button>
                                    <button class="dropdown-item" data-action="writer" data-id="${p.id}" role="menuitem">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        Open Writer
                                    </button>
                                    <div class="dropdown-divider" role="separator"></div>
                                    <button class="dropdown-item dropdown-danger" data-action="delete" data-id="${p.id}" role="menuitem">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                                        Delete Project
                                    </button>
                                </div>
                            </div>
                        </div>

                        <h3 class="project-card-title">${escapeHtml(p.name)}</h3>
                        <p class="project-card-logline">${escapeHtml(p.logline || 'No logline defined yet. Click to add one.')}</p>

                        <div class="project-card-meta">
                            ${p.genre ? `<span class="meta-genre-tag">${escapeHtml(p.genre)}</span>` : ''}
                            <span class="meta-status meta-status-${(p.status || 'development').replace(/[^a-z]/g, '-')}">${statusText}</span>
                            <span class="meta-date">Updated ${formatRelativeTime(p.updatedAt)}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <a href="#/project/${p.id}" class="card-open-link" tabindex="-1" aria-hidden="true">Open Workspace →</a>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

function bindHomeEvents(container, allProjects, typeLabels, typeColors) {
    const searchInput = container.querySelector('#project-search-input');
    const gridContainer = container.querySelector('#projects-grid-container');
    const filterTabs = container.querySelectorAll('.filter-tab');

    let currentFilter = 'all';
    let searchQuery = '';

    function applyFilters() {
        let filtered = allProjects;

        if (currentFilter === 'film') {
            filtered = filtered.filter(p => p.type === 'film' || p.type === 'short');
        } else if (currentFilter === 'series') {
            filtered = filtered.filter(p => (p.type || '').includes('series'));
        } else if (currentFilter === 'pinned') {
            filtered = filtered.filter(p => p.pinned);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.logline || '').toLowerCase().includes(q) ||
                (p.genre || '').toLowerCase().includes(q)
            );
        }

        gridContainer.innerHTML = renderProjectsGrid(filtered, typeLabels, typeColors);
        bindCardActions(gridContainer);
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            applyFilters();
        });
        // Clear on Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchQuery = '';
                applyFilters();
            }
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentFilter = tab.getAttribute('data-filter');
            applyFilters();
        });
    });

    bindCardActions(gridContainer);
}

function bindCardActions(container) {
    if (!container) return;

    // Card click (keyboard & mouse)
    container.querySelectorAll('.project-card').forEach(card => {
        const pid = card.getAttribute('data-id');

        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.card-dropdown') || e.target.closest('.card-open-link')) return;
            router.navigate(`/project/${pid}`);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.navigate(`/project/${pid}`);
            }
        });
    });

    // Pin buttons
    container.querySelectorAll('[data-pin]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const pid = btn.getAttribute('data-pin');
            const p = await projects.get(pid);
            if (p) {
                await projects.update(pid, { pinned: !p.pinned });
                showToast(p.pinned ? 'Project unpinned' : 'Project pinned', 'success');
                renderHome(document.getElementById('app-content'));
            }
        });
    });

    // More menu toggles
    container.querySelectorAll('[data-menu]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pid = btn.getAttribute('data-menu');
            const menu = document.getElementById(`card-menu-${pid}`);
            // Close all other menus
            document.querySelectorAll('.card-dropdown').forEach(d => {
                if (d !== menu) d.classList.add('hidden');
            });
            const isNowOpen = menu?.classList.toggle('hidden') === false;
            btn.setAttribute('aria-expanded', String(!menu?.classList.contains('hidden')));
            if (isNowOpen) {
                menu?.querySelector('button')?.focus();
            }
        });
    });

    // Close menus on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.card-dropdown').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('[data-menu]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }, { once: true });

    // Menu action buttons
    container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = btn.getAttribute('data-action');
            const pid = btn.getAttribute('data-id');

            // Close the menu
            document.querySelectorAll('.card-dropdown').forEach(d => d.classList.add('hidden'));

            if (action === 'open') {
                router.navigate(`/project/${pid}`);
            } else if (action === 'writer') {
                router.navigate(`/project/${pid}/writer`);
            } else if (action === 'delete') {
                const confirmed = await confirmDialog({
                    title: 'Delete Project',
                    message: 'This will permanently delete the project and all associated data including screenplays, characters, locations, scenes, and production data. This cannot be undone.',
                    confirmText: 'Delete Project',
                    isDanger: true
                });

                if (confirmed) {
                    try {
                        await projects.delete(pid);
                        showToast('Project deleted', 'success');
                        renderHome(document.getElementById('app-content'));
                    } catch (err) {
                        showToast('Failed to delete project: ' + err.message, 'error');
                    }
                }
            }
        });
    });
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return 'never';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
