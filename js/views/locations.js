/**
 * locations.js — Location Master Database for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, locations } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog, Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    location: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="18" y2="12"></line></svg>`,
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
};

export async function renderLocations(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Locations', href: `#/project/${project.id}/locations` }
    ]);

    const locList = await locations.getByProject(projectId);

    container.innerHTML = `
        <div class="locations-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Locations Database</h1>
                    <p class="view-subtitle">Master world-building locations, soundscapes, and scene environments for ${escapeHtml(project.name)}.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-location-btn" class="btn primary">
                        ${SVG.plus} Add Location
                    </button>
                </div>
            </div>

            <div class="locations-filter-bar">
                <div class="role-filter-pills">
                    <button class="role-pill active" data-type="all">All (${locList.length})</button>
                    <button class="role-pill" data-type="INT.">INT. (${locList.filter(l => l.type === 'INT.').length})</button>
                    <button class="role-pill" data-type="EXT.">EXT. (${locList.filter(l => l.type === 'EXT.').length})</button>
                    <button class="role-pill" data-type="INT./EXT.">INT./EXT. (${locList.filter(l => l.type === 'INT./EXT.').length})</button>
                </div>
                <div class="location-search search-input-wrapper">
                    <span class="search-icon-affix">${SVG.search}</span>
                    <input type="text" id="location-search-input" class="search-input" placeholder="Search locations by slugline, region, mood..." />
                </div>
            </div>

            <div id="locations-grid-container">
                ${locList.length === 0 ? renderNoLocationsState() : renderLocationsGrid(locList, project)}
            </div>
        </div>
    `;

    bindLocationEvents(container, project, locList);
}

function renderNoLocationsState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-cyan);">${SVG.location}</div>
            <h2>No Locations Added Yet</h2>
            <p>Define your shooting locations and world settings. These integrate automatically with screenplay scene headings (sluglines) and breakdown records.</p>
            <button id="create-first-loc-btn" class="btn primary btn-lg">
                ${SVG.plus} Add First Location
            </button>
        </div>
    `;
}

function renderLocationsGrid(list, project) {
    if (list.length === 0) {
        return `<div class="empty-filter-state"><p>No locations match your filter or search query.</p></div>`;
    }

    return `
        <div class="locations-grid">
            ${list.map(loc => `
                <div class="location-card" data-id="${loc.id}">
                    <div class="location-card-header">
                        <span class="loc-type-badge type-${loc.type ? loc.type.toLowerCase().replace(/[^a-z]/g, '') : 'int'}">${escapeHtml(loc.type || 'INT.')}</span>
                        <h3 class="location-name">${escapeHtml(loc.name)}</h3>
                        <button class="btn-icon-ghost delete-loc-btn" data-id="${loc.id}" title="Delete Location">
                            ${SVG.trash}
                        </button>
                    </div>

                    <div class="location-card-body">
                        ${loc.region ? `<div class="location-region"><strong>Region:</strong> ${escapeHtml(loc.region)}</div>` : ''}
                        <p class="location-desc-snippet">${escapeHtml(loc.description || loc.atmosphere || 'No atmospheric description provided.')}</p>
                    </div>

                    <div class="location-card-footer">
                        <a href="#/project/${project.id}/locations/${loc.id}" class="btn small secondary full-width" style="display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                            View &amp; Edit Details ${SVG.arrowRight}
                        </a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function bindLocationEvents(container, project, locList) {
    const searchInput = container.querySelector('#location-search-input');
    const typePills = container.querySelectorAll('.role-pill');
    const gridContainer = container.querySelector('#locations-grid-container');

    let currentType = 'all';
    let searchQuery = '';

    function applyFilters() {
        let filtered = locList;
        if (currentType !== 'all') {
            filtered = filtered.filter(l => (l.type || '').toUpperCase() === currentType.toUpperCase());
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(l =>
                l.name.toLowerCase().includes(q) ||
                (l.region && l.region.toLowerCase().includes(q)) ||
                (l.description && l.description.toLowerCase().includes(q)) ||
                (l.atmosphere && l.atmosphere.toLowerCase().includes(q))
            );
        }
        gridContainer.innerHTML = renderLocationsGrid(filtered, project);
        bindCardActions(gridContainer, project);
    }

    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyFilters();
    });

    typePills.forEach(pill => {
        pill.addEventListener('click', () => {
            typePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentType = pill.getAttribute('data-type');
            applyFilters();
        });
    });

    const openAddModal = () => {
        const modal = new Modal({
            title: 'Add New Location',
            size: 'medium',
            content: `
                <div class="form-row">
                    <div class="form-group" style="width: 140px;">
                        <label class="form-label">Type</label>
                        <select id="modal-loc-type" class="form-select">
                            <option value="INT." selected>INT.</option>
                            <option value="EXT.">EXT.</option>
                            <option value="INT./EXT.">INT./EXT.</option>
                        </select>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Location Name (Slugline cue) <span class="required">*</span></label>
                        <input type="text" id="modal-loc-name" class="form-input uppercase-input" placeholder="e.g. ABANDONED METRO STATION" required />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Region / World Setting</label>
                    <input type="text" id="modal-loc-region" class="form-input" placeholder="e.g. Sector 4, Lower East Side, Cyber District" />
                </div>
                <div class="form-group">
                    <label class="form-label">Atmosphere &amp; Lighting</label>
                    <textarea id="modal-loc-atmosphere" class="form-textarea" rows="2" placeholder="Flickering fluorescent tubes, damp concrete, constant low-frequency drone..."></textarea>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Location',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const typeVal = document.getElementById('modal-loc-type')?.value || 'INT.';
                        const nameVal = document.getElementById('modal-loc-name')?.value.trim().toUpperCase();
                        const regionVal = document.getElementById('modal-loc-region')?.value.trim() || '';
                        const atmosVal = document.getElementById('modal-loc-atmosphere')?.value.trim() || '';

                        if (!nameVal) {
                            document.getElementById('modal-loc-name')?.focus();
                            return;
                        }

                        const newLoc = await locations.create({
                            projectId: project.id,
                            type: typeVal,
                            name: nameVal,
                            region: regionVal,
                            atmosphere: atmosVal
                        });

                        m.close();
                        showToast(`Location "${typeVal} ${nameVal}" created!`, 'success');
                        router.navigate(`/project/${project.id}/locations/${newLoc.id}`);
                    }
                }
            ]
        });
        modal.open();
    };

    container.querySelector('#add-location-btn')?.addEventListener('click', openAddModal);
    container.querySelector('#create-first-loc-btn')?.addEventListener('click', openAddModal);

    bindCardActions(gridContainer, project);
}

function bindCardActions(container, project) {
    container.querySelectorAll('.delete-loc-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const locId = btn.getAttribute('data-id');
            const loc = await locations.get(locId);
            if (!loc) return;

            const confirmed = await confirmDialog({
                title: `Delete Location ${loc.name}?`,
                message: 'Are you sure you want to remove this location from the project? Linked scenes will lose their setting association.',
                confirmText: 'Delete Location',
                isDanger: true
            });

            if (confirmed) {
                await locations.delete(locId);
                showToast(`Location ${loc.name} deleted`, 'success');
                renderLocations(document.getElementById('app-content'), { id: project.id });
            }
        });
    });

    container.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            const lid = card.getAttribute('data-id');
            router.navigate(`/project/${project.id}/locations/${lid}`);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
