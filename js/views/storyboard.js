/**
 * storyboard.js — Visual Storyboard Sequence Planning for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, scenes, storyboards, shots } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { Modal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    storyboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    clapper: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    shots: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`,
    sound: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`
};

export async function renderStoryboard(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Storyboard Planning', href: `#/project/${project.id}/storyboard` }
    ]);

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const filterSceneId = urlParams.get('scene') || null;

    const allScenes = await scenes.getByProject(projectId);
    const allFrames = await storyboards.getByProject(projectId);
    const allShots = await shots.getByProject(projectId);

    const shotMap = new Map(allShots.map(s => [s.id, s]));
    const sceneMap = new Map(allScenes.map(s => [s.id, s]));

    const filteredFrames = filterSceneId 
        ? allFrames.filter(f => f.sceneId === filterSceneId)
        : allFrames;

    container.innerHTML = `
        <div class="storyboard-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Storyboard Sequence Suite</h1>
                    <p class="view-subtitle">Frame-by-frame visual planning linked to stable scenes and shot lists.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-frame-btn" class="btn primary">
                        ${SVG.plus} Add Storyboard Frame
                    </button>
                </div>
            </div>

            <!-- Scene Filter Tabs -->
            <div class="characters-filter-bar">
                <div class="role-filter-pills">
                    <button class="role-pill ${!filterSceneId ? 'active' : ''}" data-scene="all">All Scenes (${allFrames.length})</button>
                    ${allScenes.map(s => `
                        <button class="role-pill ${filterSceneId === s.id ? 'active' : ''}" data-scene="${s.id}">
                            Scene #${s.sceneNumber} (${allFrames.filter(f => f.sceneId === s.id).length})
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Frames Grid or Empty -->
            <div id="storyboard-grid-container">
                ${filteredFrames.length === 0 ? renderNoFrames(project, allScenes) : renderFramesGrid(filteredFrames, project, sceneMap, shotMap)}
            </div>
        </div>
    `;

    bindStoryboardEvents(container, project, allScenes, allFrames);
}

function renderNoFrames(project, allScenes) {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-magenta);">${SVG.storyboard}</div>
            <h2>No Storyboard Frames Yet</h2>
            <p>Visualize your cinematic coverage. Create frames with shot sizes, camera angles, camera movements, and link them to scenes and camera shots.</p>
            <button id="create-first-frame-btn" class="btn primary btn-lg">
                ${SVG.plus} Add First Storyboard Frame
            </button>
        </div>
    `;
}

function renderFramesGrid(frames, project, sceneMap, shotMap) {
    return `
        <div class="storyboard-grid">
            ${frames.map((frame, i) => {
                const scn = frame.sceneId ? sceneMap.get(frame.sceneId) : null;
                const sht = frame.shotId ? shotMap.get(frame.shotId) : null;

                return `
                    <div class="storyboard-card" data-id="${frame.id}">
                        <div class="storyboard-preview">
                            <span class="storyboard-badge">FRAME #${frame.frameNumber || (i + 1)}</span>
                            <span class="storyboard-shot-type">${frame.shotSize} • ${frame.cameraAngle}</span>

                            <!-- SVG Cinematic Aspect Ratio Box -->
                            <svg width="85%" height="70%" viewBox="0 0 320 180" style="border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 4px;">
                                <rect width="320" height="180" fill="rgba(19, 16, 38, 0.6)"/>
                                <circle cx="160" cy="90" r="35" stroke="var(--cine-cyan)" stroke-width="2" fill="none" opacity="0.6"/>
                                <line x1="160" y1="20" x2="160" y2="160" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4"/>
                                <line x1="30" y1="90" x2="290" y2="90" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4"/>
                                <text x="160" y="95" fill="var(--cine-magenta)" font-size="12" text-anchor="middle" font-family="sans-serif" font-weight="bold">${(frame.movement || 'Static').toUpperCase()}</text>
                            </svg>
                        </div>

                        <div class="storyboard-body">
                            <div class="link-category-row" style="margin-bottom: 0.25rem;">
                                ${scn ? `
                                    <a href="#/project/${project.id}/scenes" class="entity-chip entity-chip-scene" title="View Scene in Scenes Hub" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                        ${SVG.clapper} Scene #${scn.sceneNumber} (${escapeHtml(scn.heading)})
                                    </a>
                                ` : '<span class="text-muted">Unlinked Scene</span>'}
                            </div>

                            <p class="storyboard-desc">${escapeHtml(frame.description || 'No description entered.')}</p>

                            ${frame.soundNote ? `
                                <div style="font-size: 0.75rem; color: var(--cine-yellow); display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.2rem;">
                                    ${SVG.sound} <strong>Sound:</strong> ${escapeHtml(frame.soundNote)}
                                </div>
                            ` : ''}

                            <div class="storyboard-meta-row" style="margin-top: 0.65rem;">
                                <span>Duration: ${escapeHtml(frame.duration || '3s')}</span>
                                ${sht ? `
                                    <a href="#/project/${project.id}/shots" class="entity-chip entity-chip-shot" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                        ${SVG.shots} Shot ${sht.shotNumber}
                                    </a>
                                ` : `
                                    <button class="btn small secondary create-shot-from-frame-btn" data-frame-id="${frame.id}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                        ${SVG.plus} Make Shot
                                    </button>
                                `}
                                <button class="btn-icon-ghost delete-frame-btn" data-id="${frame.id}" title="Delete Frame">
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

function bindStoryboardEvents(container, project, allScenes, allFrames) {
    // Filter tabs
    container.querySelectorAll('.role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const scn = pill.getAttribute('data-scene');
            if (scn === 'all') {
                window.location.hash = `#/project/${project.id}/storyboard`;
            } else {
                window.location.hash = `#/project/${project.id}/storyboard?scene=${scn}`;
            }
        });
    });

    const openAddModal = () => {
        const modal = new Modal({
            title: 'Add Storyboard Frame',
            size: 'medium',
            content: `
                <div class="form-group">
                    <label class="form-label">Linked Scene <span class="required">*</span></label>
                    <select id="modal-stb-scene" class="form-select">
                        ${allScenes.map(s => `
                            <option value="${s.id}">Scene #${s.sceneNumber}: ${escapeHtml(s.heading)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Shot Size</label>
                        <select id="modal-stb-size" class="form-select">
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
                        <label class="form-label">Camera Angle</label>
                        <select id="modal-stb-angle" class="form-select">
                            <option value="Eye Level" selected>Eye Level</option>
                            <option value="High Angle">High Angle</option>
                            <option value="Low Angle">Low Angle</option>
                            <option value="Dutch Tilt">Dutch Tilt</option>
                            <option value="Bird's Eye">Bird's Eye</option>
                        </select>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Camera Movement</label>
                        <select id="modal-stb-movement" class="form-select">
                            <option value="Static" selected>Static</option>
                            <option value="Pan">Pan</option>
                            <option value="Tilt">Tilt</option>
                            <option value="Dolly In">Dolly In</option>
                            <option value="Track">Tracking</option>
                            <option value="Handheld">Handheld</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Visual Action &amp; Framing Description</label>
                    <textarea id="modal-stb-desc" class="form-textarea" rows="3" placeholder="Protagonist steps into rain-soaked doorway, looking back over shoulder..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Estimated Duration</label>
                        <input type="text" id="modal-stb-duration" class="form-input" value="4s" placeholder="e.g. 3s, 5s" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Sound &amp; Foley Cue</label>
                        <input type="text" id="modal-stb-sound" class="form-input" placeholder="Heavy downpour, siren in background" />
                    </div>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Frame',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const sceneId = document.getElementById('modal-stb-scene')?.value;
                        const shotSize = document.getElementById('modal-stb-size')?.value || 'MS';
                        const cameraAngle = document.getElementById('modal-stb-angle')?.value || 'Eye Level';
                        const movement = document.getElementById('modal-stb-movement')?.value || 'Static';
                        const desc = document.getElementById('modal-stb-desc')?.value.trim() || '';
                        const duration = document.getElementById('modal-stb-duration')?.value.trim() || '3s';
                        const sound = document.getElementById('modal-stb-sound')?.value.trim() || '';

                        const count = allFrames.length + 1;
                        await storyboards.create({
                            projectId: project.id,
                            sceneId,
                            order: count,
                            frameNumber: count,
                            shotSize,
                            cameraAngle,
                            movement,
                            description: desc,
                            duration,
                            soundNote: sound
                        });

                        m.close();
                        showToast(`Storyboard Frame #${count} created!`, 'success');
                        renderStoryboard(container, { id: project.id });
                    }
                }
            ]
        });
        modal.open();
    };

    container.querySelector('#add-frame-btn')?.addEventListener('click', openAddModal);
    container.querySelector('#create-first-frame-btn')?.addEventListener('click', openAddModal);

    // Delete frame
    container.querySelectorAll('.delete-frame-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fid = btn.getAttribute('data-id');
            const confirmed = await confirmDialog({
                title: 'Delete Storyboard Frame?',
                message: 'Are you sure you want to delete this frame?',
                confirmText: 'Delete Frame',
                isDanger: true
            });
            if (confirmed) {
                await storyboards.delete(fid);
                showToast('Storyboard frame removed', 'success');
                renderStoryboard(container, { id: project.id });
            }
        });
    });

    // Make shot from frame
    container.querySelectorAll('.create-shot-from-frame-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const frameId = btn.getAttribute('data-frame-id');
            const frame = await storyboards.get(frameId);
            if (!frame) return;

            const existingShots = await shots.getByScene(frame.sceneId);
            const shotNum = `${existingShots.length + 1}A`;

            const newShot = await shots.create({
                projectId: project.id,
                sceneId: frame.sceneId,
                frameId: frame.id,
                shotNumber: shotNum,
                shotSize: frame.shotSize,
                angle: frame.cameraAngle,
                movement: frame.movement,
                description: frame.description,
                status: 'planned'
            });

            await storyboards.update(frame.id, { shotId: newShot.id });

            showToast(`Created Shot ${shotNum} linked to this frame!`, 'success');
            renderStoryboard(container, { id: project.id });
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
