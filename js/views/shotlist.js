/**
 * shotlist.js — Camera Shot List & Production Coverage for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, scenes, shots, storyboards } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { Modal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    camera: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    clapper: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    storyboard: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>`
};

export async function renderShotList(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Shot List', href: `#/project/${project.id}/shots` }
    ]);

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const filterSceneId = urlParams.get('scene') || null;

    const allScenes = await scenes.getByProject(projectId);
    const allShots = await shots.getByProject(projectId);
    const allFrames = await storyboards.getByProject(projectId);

    const frameMap = new Map(allFrames.map(f => [f.id, f]));
    const sceneMap = new Map(allScenes.map(s => [s.id, s]));

    const filteredShots = filterSceneId 
        ? allShots.filter(s => s.sceneId === filterSceneId)
        : allShots;

    container.innerHTML = `
        <div class="shotlist-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Camera Shot List &amp; Coverage</h1>
                    <p class="view-subtitle">Detailed camera setups, focal lengths, framing, movement, and track status linked directly to scenes and storyboard frames.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-shot-btn" class="btn primary">
                        ${SVG.plus} Add Camera Shot
                    </button>
                </div>
            </div>

            <!-- Scene Filter Tabs -->
            <div class="characters-filter-bar">
                <div class="role-filter-pills">
                    <button class="role-pill ${!filterSceneId ? 'active' : ''}" data-scene="all">All Scenes (${allShots.length})</button>
                    ${allScenes.map(s => `
                        <button class="role-pill ${filterSceneId === s.id ? 'active' : ''}" data-scene="${s.id}">
                            Scene #${s.sceneNumber} (${allShots.filter(sh => sh.sceneId === s.id).length})
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="shotlist-table-wrapper">
                ${filteredShots.length === 0 ? renderNoShots(project, allScenes) : renderShotsTable(filteredShots, project, sceneMap, frameMap)}
            </div>
        </div>
    `;

    bindShotEvents(container, project, allScenes, allShots);
}

function renderNoShots(project, allScenes) {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-cyan);">${SVG.camera}</div>
            <h2>No Shots Planned Yet</h2>
            <p>Break your scenes down into camera setups. Specify focal lenses, framing, camera motion, and track setup status on set.</p>
            <button id="create-first-shot-btn" class="btn primary btn-lg">
                ${SVG.plus} Add First Shot
            </button>
        </div>
    `;
}

function renderShotsTable(shotList, project, sceneMap, frameMap) {
    return `
        <table class="episodes-table">
            <thead>
                <tr>
                    <th style="width: 75px;">SHOT</th>
                    <th style="width: 140px;">SCENE</th>
                    <th>FRAMING &amp; ANGLE</th>
                    <th>LENS / CAMERA</th>
                    <th>ACTION / DESCRIPTION</th>
                    <th style="width: 130px;">STATUS</th>
                    <th style="width: 80px; text-align: right;">ACTIONS</th>
                </tr>
            </thead>
            <tbody>
                ${shotList.map(sht => {
                    const scn = sht.sceneId ? sceneMap.get(sht.sceneId) : null;
                    const frame = sht.frameId ? frameMap.get(sht.frameId) : null;

                    return `
                        <tr data-id="${sht.id}">
                            <td><strong style="color: var(--cine-magenta); font-size: 1.05rem; letter-spacing: 0.05em;">${sht.shotNumber}</strong></td>
                            <td>
                                ${scn ? `
                                    <a href="#/project/${project.id}/scenes" class="entity-chip entity-chip-scene" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                        ${SVG.clapper} #${scn.sceneNumber}
                                    </a>
                                ` : '<span class="text-muted">—</span>'}
                            </td>
                            <td>
                                <div style="font-weight: 600; color: var(--app-text);">${escapeHtml(sht.shotSize || 'MS')} • ${escapeHtml(sht.angle || 'Eye Level')}</div>
                                <div style="font-size: 0.72rem; color: var(--app-text-muted);">${escapeHtml(sht.movement || 'Static')}</div>
                            </td>
                            <td>
                                <div style="color: var(--cine-cyan); font-weight: 500;">${escapeHtml(sht.lens || '35mm')}</div>
                                <div style="font-size: 0.72rem; color: var(--app-text-muted);">${escapeHtml(sht.camera || 'A-Cam')}</div>
                            </td>
                            <td>
                                <div style="line-height: 1.4; color: var(--app-text);">${escapeHtml(sht.description || '—')}</div>
                                ${frame ? `
                                    <div style="margin-top: 0.35rem;">
                                        <a href="#/project/${project.id}/storyboard" class="entity-chip entity-chip-shot" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                            ${SVG.storyboard} Frame #${frame.frameNumber}
                                        </a>
                                    </div>
                                ` : ''}
                            </td>
                            <td>
                                <select class="form-select small-select shot-status-select" data-id="${sht.id}">
                                    <option value="planned" ${sht.status === 'planned' ? 'selected' : ''}>Planned</option>
                                    <option value="setup" ${sht.status === 'setup' ? 'selected' : ''}>Setup</option>
                                    <option value="shot" ${sht.status === 'shot' ? 'selected' : ''}>Shot Completed</option>
                                    <option value="cut" ${sht.status === 'cut' ? 'selected' : ''}>Cut</option>
                                </select>
                            </td>
                            <td style="text-align: right;">
                                <button class="btn-icon-ghost delete-shot-btn" data-id="${sht.id}" title="Delete Shot">
                                    ${SVG.trash}
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function bindShotEvents(container, project, allScenes, allShots) {
    container.querySelectorAll('.role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const scn = pill.getAttribute('data-scene');
            if (scn === 'all') {
                window.location.hash = `#/project/${project.id}/shots`;
            } else {
                window.location.hash = `#/project/${project.id}/shots?scene=${scn}`;
            }
        });
    });

    const openAddModal = () => {
        const modal = new Modal({
            title: 'Add Camera Shot',
            size: 'medium',
            content: `
                <div class="form-row">
                    <div class="form-group" style="width: 110px;">
                        <label class="form-label">Shot #</label>
                        <input type="text" id="modal-shot-num" class="form-input" value="${allShots.length + 1}A" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Linked Scene <span class="required">*</span></label>
                        <select id="modal-shot-scene" class="form-select">
                            ${allScenes.map(s => `
                                <option value="${s.id}">Scene #${s.sceneNumber}: ${escapeHtml(s.heading)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Shot Size</label>
                        <select id="modal-shot-size" class="form-select">
                            <option value="WS">Wide Shot (WS)</option>
                            <option value="MS" selected>Medium Shot (MS)</option>
                            <option value="MCU">Medium Close-Up (MCU)</option>
                            <option value="CU">Close-Up (CU)</option>
                            <option value="ECU">Extreme Close-Up (ECU)</option>
                            <option value="POV">Point of View (POV)</option>
                            <option value="OTS">Over The Shoulder (OTS)</option>
                        </select>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Lens</label>
                        <input type="text" id="modal-shot-lens" class="form-input" value="35mm Prime" placeholder="e.g. 50mm, 24mm Anamorphic" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Movement</label>
                        <select id="modal-shot-movement" class="form-select">
                            <option value="Static" selected>Static (Tripod)</option>
                            <option value="Pan">Pan Left/Right</option>
                            <option value="Dolly">Dolly In/Out</option>
                            <option value="Track">Lateral Track</option>
                            <option value="Handheld">Handheld / Steadicam</option>
                            <option value="Jib">Jib / Crane</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Action &amp; Framing Notes</label>
                    <textarea id="modal-shot-desc" class="form-textarea" rows="3" placeholder="Camera tracks protagonist as she enters the wet alleyway, framing her profile against neon sign..."></textarea>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Add Shot',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const shotNum = document.getElementById('modal-shot-num')?.value.trim() || '1A';
                        const sceneId = document.getElementById('modal-shot-scene')?.value;
                        const shotSize = document.getElementById('modal-shot-size')?.value || 'MS';
                        const lens = document.getElementById('modal-shot-lens')?.value.trim() || '35mm';
                        const movement = document.getElementById('modal-shot-movement')?.value || 'Static';
                        const desc = document.getElementById('modal-shot-desc')?.value.trim() || '';

                        await shots.create({
                            projectId: project.id,
                            sceneId,
                            shotNumber: shotNum,
                            shotSize,
                            lens,
                            movement,
                            description: desc,
                            status: 'planned'
                        });

                        m.close();
                        showToast(`Shot ${shotNum} created!`, 'success');
                        renderShotList(container, { id: project.id });
                    }
                }
            ]
        });
        modal.open();
    };

    container.querySelector('#add-shot-btn')?.addEventListener('click', openAddModal);
    container.querySelector('#create-first-shot-btn')?.addEventListener('click', openAddModal);

    // Status change
    container.querySelectorAll('.shot-status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const shotId = sel.getAttribute('data-id');
            await shots.update(shotId, { status: sel.value });
            showToast('Shot status updated', 'info');
        });
    });

    // Delete shot
    container.querySelectorAll('.delete-shot-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sid = btn.getAttribute('data-id');
            const confirmed = await confirmDialog({
                title: 'Delete Camera Shot?',
                message: 'Are you sure you want to remove this shot record from the coverage sheet?',
                confirmText: 'Delete Shot',
                isDanger: true
            });
            if (confirmed) {
                await shots.delete(sid);
                showToast('Shot removed', 'success');
                renderShotList(container, { id: project.id });
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
