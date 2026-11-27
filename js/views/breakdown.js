/**
 * breakdown.js — Production Breakdown Module for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, scenes, characters, locations, breakdownItems } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    breakdown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    print: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
    writer: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    location: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    tag: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    close: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

export async function renderBreakdown(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Production Breakdown', href: `#/project/${project.id}/breakdown` }
    ]);

    const allScenes = await scenes.getByProject(projectId);
    const allChars = await characters.getByProject(projectId);
    const allLocs = await locations.getByProject(projectId);
    const allItems = await breakdownItems.getByProject(projectId);

    const charMap = new Map(allChars.map(c => [c.id, c]));
    const locMap = new Map(allLocs.map(l => [l.id, l]));

    // Group items by sceneId
    const itemsByScene = new Map();
    for (const scn of allScenes) {
        itemsByScene.set(scn.id, []);
    }
    for (const item of allItems) {
        if (itemsByScene.has(item.sceneId)) {
            itemsByScene.get(item.sceneId).push(item);
        }
    }

    container.innerHTML = `
        <div class="breakdown-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Production Breakdown Sheet</h1>
                    <p class="view-subtitle">Department elements (props, wardrobe, vehicles, VFX, stunts, sound) linked directly to addressable scene records.</p>
                </div>
                <div class="view-header-actions">
                    <span class="breakdown-stats-pill">
                        <strong>${allItems.length}</strong> Production Elements Tagged
                    </span>
                    <button id="print-breakdown-btn" class="btn secondary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.print} Print Breakdown Sheet
                    </button>
                </div>
            </div>

            <!-- Breakdown Scenes Table -->
            <div class="breakdown-table-wrapper">
                ${allScenes.length === 0 ? renderNoScenes(project) : renderBreakdownTable(allScenes, itemsByScene, project, charMap, locMap)}
            </div>
        </div>
    `;

    bindBreakdownEvents(container, project, allScenes, allChars);
}

function renderNoScenes(project) {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-coral);">${SVG.breakdown}</div>
            <h2>No Scenes to Break Down</h2>
            <p>Write your screenplay in the Writer module to generate scenes and unlock script breakdown tagging.</p>
            <a href="#/project/${project.id}/writer" class="btn primary btn-lg" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                ${SVG.writer} Open Screenplay Writer
            </a>
        </div>
    `;
}

function renderBreakdownTable(allScenes, itemsByScene, project, charMap, locMap) {
    return `
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th style="width: 75px;">SCN #</th>
                    <th style="width: 80px;">I / E</th>
                    <th>SLUGLINE &amp; SETTING</th>
                    <th>CAST REQUIRED</th>
                    <th>DEPARTMENT ELEMENTS (PROPS, WARDROBE, VFX, STUNTS)</th>
                    <th style="width: 100px; text-align: right;">ADD ELEMENT</th>
                </tr>
            </thead>
            <tbody>
                ${allScenes.map(scn => {
                    const loc = scn.locationId ? locMap.get(scn.locationId) : null;
                    const charList = (scn.characterIds || []).map(cid => charMap.get(cid)).filter(Boolean);
                    const bItems = itemsByScene.get(scn.id) || [];

                    return `
                        <tr data-scene-id="${scn.id}">
                            <td class="scene-num-badge">#${scn.sceneNumber}</td>
                            <td><span class="badge ${scn.intExt === 'EXT.' ? 'ext-badge' : 'int-badge'}">${scn.intExt || 'INT.'}</span></td>
                            <td>
                                <strong>${escapeHtml(scn.heading)}</strong>
                                ${loc ? `
                                    <div style="margin-top: 0.25rem;">
                                        <a href="#/project/${project.id}/locations/${loc.id}" class="entity-chip entity-chip-loc" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                            ${SVG.location} ${escapeHtml(loc.name)}
                                        </a>
                                    </div>
                                ` : ''}
                            </td>
                            <td>
                                <div class="entity-chips-wrap">
                                    ${charList.length === 0 ? '<span class="text-muted">None</span>' : charList.map(c => `
                                        <a href="#/project/${project.id}/characters/${c.id}" class="entity-chip entity-chip-char" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                            ${SVG.user} ${escapeHtml(c.name)}
                                        </a>
                                    `).join('')}
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;">
                                    ${bItems.length === 0 ? '<span class="text-muted" style="font-size: 0.78rem;">No elements tagged</span>' : bItems.map(item => `
                                        <span class="dept-tag tag-${item.category}">
                                            ${escapeHtml(item.name)}
                                            <button class="delete-item-tiny" data-id="${item.id}" title="Remove">
                                                ${SVG.close}
                                            </button>
                                        </span>
                                    `).join('')}
                                </div>
                            </td>
                            <td style="text-align: right;">
                                <button class="btn small primary add-element-btn" data-scene-id="${scn.id}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                    ${SVG.plus} Tag
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function bindBreakdownEvents(container, project, allScenes, allChars) {
    container.querySelector('#print-breakdown-btn')?.addEventListener('click', () => {
        window.print();
    });

    // Tag element modal
    container.querySelectorAll('.add-element-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scnId = btn.getAttribute('data-scene-id');
            const scn = allScenes.find(s => s.id === scnId);

            const modal = new Modal({
                title: `Tag Breakdown Element (Scene #${scn?.sceneNumber})`,
                size: 'medium',
                content: `
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Department Category <span class="required">*</span></label>
                            <select id="modal-b-cat" class="form-select">
                                <option value="props" selected>Props</option>
                                <option value="wardrobe">Wardrobe / Costume</option>
                                <option value="vehicles">Vehicles</option>
                                <option value="stunts">Stunts</option>
                                <option value="vfx">Visual Effects (VFX)</option>
                                <option value="sfx">Special Effects (SFX)</option>
                                <option value="sound">Special Sound / Music</option>
                                <option value="special_equipment">Special Camera / Grip Equipment</option>
                            </select>
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Element Name <span class="required">*</span></label>
                            <input type="text" id="modal-b-name" class="form-input" placeholder="e.g. Damascus Dagger, Wet Trench Coat" required />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Character Association (Optional)</label>
                        <select id="modal-b-char" class="form-select">
                            <option value="">None (General Scene Requirement)</option>
                            ${allChars.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Production Notes / Sourcing Specifications</label>
                        <textarea id="modal-b-desc" class="form-textarea" rows="2" placeholder="Hero prop; weathered steel with engraved runes on hilt..."></textarea>
                    </div>
                `,
                actions: [
                    { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                    {
                        label: 'Add to Breakdown',
                        class: 'primary',
                        onClick: async (_, m) => {
                            const cat = document.getElementById('modal-b-cat')?.value || 'props';
                            const name = document.getElementById('modal-b-name')?.value.trim();
                            if (!name) {
                                document.getElementById('modal-b-name')?.focus();
                                return;
                            }
                            const charId = document.getElementById('modal-b-char')?.value || null;
                            const desc = document.getElementById('modal-b-desc')?.value.trim() || '';

                            await breakdownItems.create({
                                projectId: project.id,
                                sceneId: scnId,
                                category: cat,
                                name,
                                characterId: charId,
                                description: desc,
                                status: 'needed'
                            });

                            m.close();
                            showToast(`Tagged ${name} to Scene #${scn?.sceneNumber}!`, 'success');
                            renderBreakdown(container, { id: project.id });
                        }
                    }
                ]
            });
            modal.open();
        });
    });

    // Delete item
    container.querySelectorAll('.delete-item-tiny').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.getAttribute('data-id');
            await breakdownItems.delete(itemId);
            showToast('Element removed from breakdown', 'info');
            renderBreakdown(container, { id: project.id });
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
