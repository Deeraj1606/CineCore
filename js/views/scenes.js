/**
 * scenes.js — Scenes Master Index & Relationship Hub for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, screenplays, scenes, locations, characters } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { syncScreenplayScenes, safeRenumberScene } from '../links.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    scenes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    writer: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    location: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    storyboard: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>`,
    shots: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`,
    breakdown: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
};

export async function renderScenes(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Scenes Master Hub', href: `#/project/${project.id}/scenes` }
    ]);

    // Ensure scenes are synced from active screenplay
    const spList = await screenplays.getByProject(projectId);
    const activeSp = spList[0];
    if (activeSp && activeSp.content) {
        await syncScreenplayScenes(projectId, activeSp.id, activeSp.content);
    }

    const sceneList = await scenes.getByProject(projectId);
    const allChars = await characters.getByProject(projectId);
    const allLocs = await locations.getByProject(projectId);

    const charMap = new Map(allChars.map(c => [c.id, c]));
    const locMap = new Map(allLocs.map(l => [l.id, l]));

    container.innerHTML = `
        <div class="scenes-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Scenes Master Hub</h1>
                    <p class="view-subtitle">Stable, addressable project entities linking screenplay text to storyboard frames, shot lists, locations, and schedules.</p>
                </div>
                <div class="view-header-actions">
                    <span class="breakdown-stats-pill">
                        <strong>${sceneList.length}</strong> Addressable Scenes
                    </span>
                    <a href="#/project/${project.id}/writer" class="btn primary">
                        ${SVG.writer} Open Screenplay Writer
                    </a>
                </div>
            </div>

            <!-- Filter Bar -->
            <div class="characters-filter-bar">
                <div class="role-filter-pills">
                    <button class="role-pill active" data-filter="all">All (${sceneList.length})</button>
                    <button class="role-pill" data-filter="INT.">INT. (${sceneList.filter(s => s.intExt === 'INT.').length})</button>
                    <button class="role-pill" data-filter="EXT.">EXT. (${sceneList.filter(s => s.intExt === 'EXT.').length})</button>
                    <button class="role-pill" data-filter="DAY">DAY (${sceneList.filter(s => s.timeOfDay === 'DAY').length})</button>
                    <button class="role-pill" data-filter="NIGHT">NIGHT (${sceneList.filter(s => s.timeOfDay === 'NIGHT').length})</button>
                </div>
                <div class="character-search search-input-wrapper">
                    <span class="search-icon-affix">${SVG.search}</span>
                    <input type="text" id="scene-search-input" class="search-input" placeholder="Search by heading, setting, or dialogue..." />
                </div>
            </div>

            <!-- Scenes List Container -->
            <div id="scenes-list-container" class="scenes-container">
                ${sceneList.length === 0 ? renderNoScenes(project) : renderScenesList(sceneList, project, charMap, locMap)}
            </div>
        </div>
    `;

    bindSceneHubEvents(container, project, sceneList, charMap, locMap);
}

function renderNoScenes(project) {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-yellow);">${SVG.scenes}</div>
            <h2>No Scenes Created Yet</h2>
            <p>Open the Screenplay Writer and write your first scene heading (e.g. <code>INT. METRO STATION - NIGHT</code>). CINECORE will automatically create addressable scene entities with stable IDs.</p>
            <a href="#/project/${project.id}/writer" class="btn primary btn-lg">
                ${SVG.writer} Open Screenplay Writer
            </a>
        </div>
    `;
}

function renderScenesList(sceneList, project, charMap, locMap) {
    return `
        <div class="scenes-grid">
            ${sceneList.map(scn => {
                const loc = scn.locationId ? locMap.get(scn.locationId) : null;
                const charList = (scn.characterIds || []).map(cid => charMap.get(cid)).filter(Boolean);

                return `
                    <div class="scene-hub-card" data-id="${scn.id}" data-intext="${scn.intExt}" data-tod="${scn.timeOfDay}">
                        <div class="scene-card-top-bar">
                            <span class="scene-pill-number">SCENE #${scn.sceneNumber}</span>
                            <span class="badge ${scn.intExt === 'EXT.' ? 'ext-badge' : 'int-badge'}">${scn.intExt || 'INT.'}</span>
                            <span class="badge time-badge">${scn.timeOfDay || 'DAY'}</span>
                            <span class="scene-pages-tag">${scn.estPages || '1/8'} pgs</span>
                            <div class="scene-quick-actions">
                                <button class="btn-icon-ghost edit-scene-btn" data-id="${scn.id}" title="Edit Scene Details">
                                    ${SVG.edit}
                                </button>
                            </div>
                        </div>

                        <h3 class="scene-hub-heading">${escapeHtml(scn.heading)}</h3>

                        ${scn.scriptExcerpt ? `
                            <div class="scene-excerpt-box">
                                <pre>${escapeHtml(scn.scriptExcerpt)}</pre>
                            </div>
                        ` : ''}

                        <!-- Dynamic Relationship Links -->
                        <div class="scene-links-matrix">
                            <div class="link-category-row">
                                <span class="link-category-lbl">SETTING:</span>
                                ${loc ? `
                                    <a href="#/project/${project.id}/locations/${loc.id}" class="entity-chip entity-chip-loc" title="View Location Profile" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                        ${SVG.location} ${escapeHtml(loc.name)}
                                    </a>
                                ` : `
                                    <span class="text-muted">${escapeHtml(scn.locationName || 'Unassigned')}</span>
                                `}
                            </div>

                            <div class="link-category-row">
                                <span class="link-category-lbl">CAST:</span>
                                <div class="entity-chips-wrap">
                                    ${charList.length === 0 ? '<span class="text-muted">None tagged</span>' : charList.map(c => `
                                        <a href="#/project/${project.id}/characters/${c.id}" class="entity-chip entity-chip-char" title="View Character Profile" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                            ${SVG.user} ${escapeHtml(c.name)}
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Cross-Module Action Quick Bar -->
                        <div class="scene-hub-footer">
                            <a href="#/project/${project.id}/storyboard?scene=${scn.id}" class="btn small secondary" title="View Storyboards for Scene" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                ${SVG.storyboard} Storyboards
                            </a>
                            <a href="#/project/${project.id}/shots?scene=${scn.id}" class="btn small secondary" title="View Shot List for Scene" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                ${SVG.shots} Shots
                            </a>
                            <a href="#/project/${project.id}/breakdown" class="btn small secondary" title="View Production Breakdown" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                ${SVG.breakdown} Breakdown
                            </a>
                            <a href="#/project/${project.id}/writer" class="btn small primary" title="Write in Screenplay" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                ${SVG.writer} Write
                            </a>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function bindSceneHubEvents(container, project, sceneList, charMap, locMap) {
    const searchInput = container.querySelector('#scene-search-input');
    const filterPills = container.querySelectorAll('.role-pill');
    const gridContainer = container.querySelector('#scenes-list-container');

    let currentFilter = 'all';
    let searchQuery = '';

    function applyFilter() {
        let filtered = sceneList;
        if (currentFilter === 'INT.' || currentFilter === 'EXT.') {
            filtered = filtered.filter(s => s.intExt === currentFilter);
        } else if (currentFilter === 'DAY' || currentFilter === 'NIGHT') {
            filtered = filtered.filter(s => s.timeOfDay === currentFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s => 
                s.heading.toLowerCase().includes(q) ||
                (s.locationName && s.locationName.toLowerCase().includes(q)) ||
                (s.scriptExcerpt && s.scriptExcerpt.toLowerCase().includes(q))
            );
        }

        gridContainer.innerHTML = renderScenesList(filtered, project, charMap, locMap);
        bindEditEvents(gridContainer);
    }

    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyFilter();
    });

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            applyFilter();
        });
    });

    function bindEditEvents(wrapper) {
        wrapper.querySelectorAll('.edit-scene-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const scnId = btn.getAttribute('data-id');
                const scn = await scenes.get(scnId);
                if (!scn) return;

                const modal = new Modal({
                    title: `Edit Scene #${scn.sceneNumber}`,
                    content: `
                        <div class="form-row">
                            <div class="form-group" style="width: 120px;">
                                <label class="form-label">Scene #</label>
                                <input type="number" id="edit-scene-num" class="form-input" value="${scn.sceneNumber}" min="1" />
                            </div>
                            <div class="form-group flex-1">
                                <label class="form-label">Slugline / Heading</label>
                                <input type="text" id="edit-scene-heading" class="form-input uppercase-input" value="${escapeHtml(scn.heading)}" />
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label class="form-label">INT / EXT</label>
                                <select id="edit-scene-intext" class="form-select">
                                    <option value="INT." ${scn.intExt === 'INT.' ? 'selected' : ''}>INT.</option>
                                    <option value="EXT." ${scn.intExt === 'EXT.' ? 'selected' : ''}>EXT.</option>
                                    <option value="INT./EXT." ${scn.intExt === 'INT./EXT.' ? 'selected' : ''}>INT./EXT.</option>
                                </select>
                            </div>
                            <div class="form-group flex-1">
                                <label class="form-label">Time of Day</label>
                                <select id="edit-scene-tod" class="form-select">
                                    <option value="DAY" ${scn.timeOfDay === 'DAY' ? 'selected' : ''}>DAY</option>
                                    <option value="NIGHT" ${scn.timeOfDay === 'NIGHT' ? 'selected' : ''}>NIGHT</option>
                                    <option value="DAWN" ${scn.timeOfDay === 'DAWN' ? 'selected' : ''}>DAWN</option>
                                    <option value="DUSK" ${scn.timeOfDay === 'DUSK' ? 'selected' : ''}>DUSK</option>
                                    <option value="CONTINUOUS" ${scn.timeOfDay === 'CONTINUOUS' ? 'selected' : ''}>CONTINUOUS</option>
                                </select>
                            </div>
                            <div class="form-group flex-1">
                                <label class="form-label">Status</label>
                                <select id="edit-scene-status" class="form-select">
                                    <option value="draft" ${scn.status === 'draft' ? 'selected' : ''}>Draft</option>
                                    <option value="revised" ${scn.status === 'revised' ? 'selected' : ''}>Revised</option>
                                    <option value="locked" ${scn.status === 'locked' ? 'selected' : ''}>Locked</option>
                                    <option value="shot" ${scn.status === 'shot' ? 'selected' : ''}>Shot</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Director &amp; Production Notes</label>
                            <textarea id="edit-scene-notes" class="form-textarea" rows="3" placeholder="Pacing notes, camera movement intentions, lighting cues...">${escapeHtml(scn.notes || '')}</textarea>
                        </div>
                    `,
                    actions: [
                        { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                        {
                            label: 'Save Scene',
                            class: 'primary',
                            onClick: async (_, m) => {
                                const newNum = parseInt(document.getElementById('edit-scene-num')?.value, 10) || scn.sceneNumber;
                                const newHeading = document.getElementById('edit-scene-heading')?.value.trim().toUpperCase() || scn.heading;
                                const newIntExt = document.getElementById('edit-scene-intext')?.value || scn.intExt;
                                const newTod = document.getElementById('edit-scene-tod')?.value || scn.timeOfDay;
                                const newStatus = document.getElementById('edit-scene-status')?.value || scn.status;
                                const newNotes = document.getElementById('edit-scene-notes')?.value.trim() || '';

                                if (newNum !== scn.sceneNumber) {
                                    await safeRenumberScene(scn.id, newNum);
                                }

                                await scenes.update(scn.id, {
                                    heading: newHeading,
                                    intExt: newIntExt,
                                    timeOfDay: newTod,
                                    status: newStatus,
                                    notes: newNotes
                                });

                                m.close();
                                showToast(`Scene #${newNum} updated!`, 'success');
                                renderScenes(container, { id: project.id });
                            }
                        }
                    ]
                });
                modal.open();
            });
        });
    }

    bindEditEvents(gridContainer);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
