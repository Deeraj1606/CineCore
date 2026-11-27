/**
 * moodboard.js — Visual Moodboard, Palettes & Concept Art for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, scenes, characters, locations, moodboards } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { Modal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    palette: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    clapper: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    location: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
};

export async function renderMoodboard(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Visual Moodboards', href: `#/project/${project.id}/moodboard` }
    ]);

    const allItems = await moodboards.getByProject(projectId);
    const allScenes = await scenes.getByProject(projectId);
    const allChars = await characters.getByProject(projectId);
    const allLocs = await locations.getByProject(projectId);

    const sceneMap = new Map(allScenes.map(s => [s.id, s]));
    const charMap = new Map(allChars.map(c => [c.id, c]));
    const locMap = new Map(allLocs.map(l => [l.id, l]));

    container.innerHTML = `
        <div class="moodboard-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Visual References &amp; Cinematography Palettes</h1>
                    <p class="view-subtitle">Curate lighting references, costume palettes, location scouting shots, and texture bibles linked to scenes, characters, and settings.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-moodboard-btn" class="btn primary">
                        ${SVG.plus} Add Visual Reference
                    </button>
                </div>
            </div>

            <!-- Category Filter Pills -->
            <div class="characters-filter-bar">
                <div class="role-filter-pills">
                    <button class="role-pill active" data-cat="all">All (${allItems.length})</button>
                    <button class="role-pill" data-cat="lighting">Lighting &amp; Tone</button>
                    <button class="role-pill" data-cat="costume">Costume &amp; Wardrobe</button>
                    <button class="role-pill" data-cat="location">Location Scouting</button>
                    <button class="role-pill" data-cat="character">Character Inspiration</button>
                    <button class="role-pill" data-cat="palette">Color Palettes</button>
                </div>
            </div>

            <!-- Moodboard Masonry -->
            <div id="moodboard-masonry-container">
                ${allItems.length === 0 ? renderNoMoodboard(project) : renderMoodboardGrid(allItems, project, sceneMap, charMap, locMap)}
            </div>
        </div>
    `;

    bindMoodboardEvents(container, project, allItems, allScenes, allChars, allLocs);
}

function renderNoMoodboard(project) {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-tangerine);">${SVG.palette}</div>
            <h2>No Visual References Added</h2>
            <p>Gather visual inspiration! Pin lighting schemes, cinematic color palettes, wardrobe lookbooks, and link them to scenes, characters, or locations.</p>
            <button id="create-first-moodboard-btn" class="btn primary btn-lg">
                ${SVG.plus} Add First Reference
            </button>
        </div>
    `;
}

function renderMoodboardGrid(items, project, sceneMap, charMap, locMap) {
    return `
        <div class="moodboard-masonry">
            ${items.map(item => {
                let linkedChip = '';
                if (item.linkedEntityType === 'scene' && sceneMap.has(item.linkedEntityId)) {
                    const scn = sceneMap.get(item.linkedEntityId);
                    linkedChip = `
                        <a href="#/project/${project.id}/scenes" class="entity-chip entity-chip-scene" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                            ${SVG.clapper} Scene #${scn.sceneNumber} (${escapeHtml(scn.heading)})
                        </a>
                    `;
                } else if (item.linkedEntityType === 'character' && charMap.has(item.linkedEntityId)) {
                    const c = charMap.get(item.linkedEntityId);
                    linkedChip = `
                        <a href="#/project/${project.id}/characters/${c.id}" class="entity-chip entity-chip-char" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                            ${SVG.user} ${escapeHtml(c.name)}
                        </a>
                    `;
                } else if (item.linkedEntityType === 'location' && locMap.has(item.linkedEntityId)) {
                    const l = locMap.get(item.linkedEntityId);
                    linkedChip = `
                        <a href="#/project/${project.id}/locations/${l.id}" class="entity-chip entity-chip-loc" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                            ${SVG.location} ${escapeHtml(l.name)}
                        </a>
                    `;
                }

                const primaryColor = (item.colors && item.colors[0]) || '#17142D';
                const secondaryColor = (item.colors && item.colors[1]) || '#713BFF';

                return `
                    <div class="moodboard-card" data-id="${item.id}" data-category="${item.category}">
                        <!-- Visual Swatch or Graphic Area -->
                        <div class="moodboard-visual" style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); display: flex; align-items: center; justify-content: center;">
                            <div style="opacity: 0.4; color: #fff;">${SVG.palette}</div>
                        </div>

                        <!-- Color Palette Strip -->
                        ${item.colors && item.colors.length > 0 ? `
                            <div class="palette-swatches">
                                ${item.colors.map(color => `
                                    <div class="swatch" style="background: ${color};" title="${color}"></div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <div class="moodboard-info">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <h4 class="moodboard-title" style="margin: 0; font-size: 0.95rem;">${escapeHtml(item.title)}</h4>
                                <span class="badge" style="background: rgba(255, 255, 255, 0.08); font-size: 0.65rem; text-transform: uppercase;">${escapeHtml(item.category || 'lighting')}</span>
                            </div>

                            <p style="font-size: 0.8rem; color: var(--app-text-muted); margin: 0; line-height: 1.45;">
                                ${escapeHtml(item.notes || 'No description notes provided.')}
                            </p>

                            ${linkedChip ? `
                                <div style="margin-top: 0.65rem;">
                                    ${linkedChip}
                                </div>
                            ` : ''}

                            <div style="display: flex; justify-content: flex-end; margin-top: 0.75rem;">
                                <button class="btn-icon-ghost delete-moodboard-btn" data-id="${item.id}" title="Delete Reference">
                                    ${SVG.trash}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function bindMoodboardEvents(container, project, allItems, allScenes, allChars, allLocs) {
    // Filter tabs
    container.querySelectorAll('.role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            container.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const cat = pill.getAttribute('data-cat');
            container.querySelectorAll('.moodboard-card').forEach(card => {
                if (cat === 'all' || card.getAttribute('data-category') === cat) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    const openAddModal = () => {
        const modal = new Modal({
            title: 'Add Visual Reference',
            size: 'medium',
            content: `
                <div class="form-group">
                    <label class="form-label">Reference Title <span class="required">*</span></label>
                    <input type="text" id="modal-mb-title" class="form-input" placeholder="e.g. Neo-Noir High Contrast Lighting" required />
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Category</label>
                        <select id="modal-mb-cat" class="form-select">
                            <option value="lighting" selected>Lighting &amp; Tone</option>
                            <option value="costume">Costume &amp; Wardrobe</option>
                            <option value="location">Location Scouting</option>
                            <option value="character">Character Inspiration</option>
                            <option value="palette">Color Palette</option>
                        </select>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Link to Entity</label>
                        <select id="modal-mb-entity-type" class="form-select">
                            <option value="general" selected>General Project</option>
                            <option value="scene">Specific Scene</option>
                            <option value="character">Specific Character</option>
                            <option value="location">Specific Location</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" id="modal-mb-entity-target-group" style="display: none;">
                    <label class="form-label" id="modal-mb-target-label">Target Entity</label>
                    <select id="modal-mb-target-id" class="form-select"></select>
                </div>
                <div class="form-group">
                    <label class="form-label">Key Color Swatches (Hex codes)</label>
                    <input type="text" id="modal-mb-colors" class="form-input" value="#713BFF, #FF38B8, #00E5FF, #FFD629" />
                </div>
                <div class="form-group">
                    <label class="form-label">Art Direction &amp; Production Design Notes</label>
                    <textarea id="modal-mb-notes" class="form-textarea" rows="3" placeholder="Saturated magenta neon highlights, deep cobalt shadows, wet asphalt reflections..."></textarea>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Reference',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const title = document.getElementById('modal-mb-title')?.value.trim();
                        if (!title) {
                            document.getElementById('modal-mb-title')?.focus();
                            return;
                        }
                        const cat = document.getElementById('modal-mb-cat')?.value || 'lighting';
                        const entityType = document.getElementById('modal-mb-entity-type')?.value;
                        const targetId = entityType !== 'general' ? document.getElementById('modal-mb-target-id')?.value : null;
                        const colorsStr = document.getElementById('modal-mb-colors')?.value || '#713BFF, #FF38B8';
                        const notes = document.getElementById('modal-mb-notes')?.value.trim() || '';

                        const colors = colorsStr.split(',').map(c => c.trim()).filter(c => c.startsWith('#'));

                        await moodboards.create({
                            projectId: project.id,
                            title,
                            category: cat,
                            linkedEntityType: entityType !== 'general' ? entityType : null,
                            linkedEntityId: targetId,
                            colors,
                            notes
                        });

                        m.close();
                        showToast(`Visual reference "${title}" added!`, 'success');
                        renderMoodboard(container, { id: project.id });
                    }
                }
            ]
        });
        modal.open();

        // Dynamically populate target dropdown
        const typeSelect = document.getElementById('modal-mb-entity-type');
        const targetGroup = document.getElementById('modal-mb-entity-target-group');
        const targetSelect = document.getElementById('modal-mb-target-id');
        const targetLabel = document.getElementById('modal-mb-target-label');

        typeSelect?.addEventListener('change', () => {
            const val = typeSelect.value;
            if (val === 'general') {
                targetGroup.style.display = 'none';
                return;
            }
            targetGroup.style.display = 'block';

            if (val === 'scene') {
                targetLabel.textContent = 'Select Scene';
                targetSelect.innerHTML = allScenes.map(s => `
                    <option value="${s.id}">Scene #${s.sceneNumber}: ${escapeHtml(s.heading)}</option>
                `).join('');
            } else if (val === 'character') {
                targetLabel.textContent = 'Select Character';
                targetSelect.innerHTML = allChars.map(c => `
                    <option value="${c.id}">${escapeHtml(c.name)}</option>
                `).join('');
            } else if (val === 'location') {
                targetLabel.textContent = 'Select Location';
                targetSelect.innerHTML = allLocs.map(l => `
                    <option value="${l.id}">${escapeHtml(l.type)} ${escapeHtml(l.name)}</option>
                `).join('');
            }
        });
    };

    container.querySelector('#add-moodboard-btn')?.addEventListener('click', openAddModal);
    container.querySelector('#create-first-moodboard-btn')?.addEventListener('click', openAddModal);

    // Delete buttons
    container.querySelectorAll('.delete-moodboard-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const mid = btn.getAttribute('data-id');
            const confirmed = await confirmDialog({
                title: 'Delete Visual Reference?',
                message: 'Are you sure you want to remove this visual reference item?',
                confirmText: 'Delete Reference',
                isDanger: true
            });
            if (confirmed) {
                await moodboards.delete(mid);
                showToast('Reference deleted', 'success');
                renderMoodboard(container, { id: project.id });
            }
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
