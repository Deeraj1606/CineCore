/**
 * location-detail.js — Location Dossier & Setting Editor for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, locations } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getLocationLinks } from '../links.js';

const SVG = {
    back: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    pin: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    atmosphere: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    notes: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    link: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    clapper: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    save: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
};

export async function renderLocationDetail(container, params) {
    const projectId = params.id;
    const locId = params.lid;

    const project = await projects.get(projectId);
    const loc = await locations.get(locId);

    if (!project || !loc) {
        router.navigate(`/project/${projectId}/locations`);
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Locations', href: `#/project/${project.id}/locations` },
        { label: loc.name, href: `#/project/${project.id}/locations/${loc.id}` }
    ]);

    // Fetch bidirectional links
    const links = await getLocationLinks(loc.id);

    container.innerHTML = `
        <div class="location-detail-view">
            <div class="memphis-bar"></div>

            <div class="detail-header">
                <div class="detail-header-left">
                    <a href="#/project/${project.id}/locations" class="btn-back">
                        ${SVG.back} Back to Locations
                    </a>
                    <div class="detail-title-group">
                        <div class="loc-badge-large">${escapeHtml(loc.type || 'INT.')}</div>
                        <div>
                            <h1 class="detail-title">${escapeHtml(loc.name)}</h1>
                            <div class="detail-subtitle">
                                ${loc.region ? `<span class="detail-meta-item">Region: ${escapeHtml(loc.region)}</span>` : ''}
                                <span class="detail-meta-item" style="color: var(--cine-yellow); font-weight: bold;">Set in ${links.scenes.length} Scenes</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-header-actions">
                    <button id="delete-location-btn" class="btn secondary danger-text">
                        ${SVG.trash} Delete
                    </button>
                    <button id="save-location-btn" class="btn primary btn-lg">
                        ${SVG.save} Save Changes
                    </button>
                </div>
            </div>

            <form id="location-detail-form" class="character-dossier-form">
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.pin}</span> 1. Setting Designation
                    </h3>

                    <div class="form-row">
                        <div class="form-group" style="width: 160px;">
                            <label class="form-label">Type</label>
                            <select id="ld-type" class="form-select">
                                <option value="INT." ${loc.type === 'INT.' ? 'selected' : ''}>INT.</option>
                                <option value="EXT." ${loc.type === 'EXT.' ? 'selected' : ''}>EXT.</option>
                                <option value="INT./EXT." ${loc.type === 'INT./EXT.' ? 'selected' : ''}>INT./EXT.</option>
                            </select>
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Location Cue Name (Slugline) <span class="required">*</span></label>
                            <input type="text" id="ld-name" class="form-input uppercase-input" value="${escapeHtml(loc.name)}" required />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Region / Broader Geography</label>
                        <input type="text" id="ld-region" class="form-input" value="${escapeHtml(loc.region || '')}" placeholder="e.g. Neo Tokyo, Sector 9, Downtown Industrial Zone" />
                    </div>
                </div>

                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.atmosphere}</span> 2. Atmosphere, Visuals &amp; Sound
                    </h3>

                    <div class="form-group">
                        <label class="form-label">Visual Atmosphere &amp; Lighting</label>
                        <textarea id="ld-atmosphere" class="form-textarea" rows="3" placeholder="High contrast shadows, amber vapor lamps, smoke curls, neon reflections...">${escapeHtml(loc.atmosphere || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Environmental Soundscape</label>
                        <textarea id="ld-sound" class="form-textarea" rows="2" placeholder="Distant sirens, hum of ventilation shafts, heavy rain on corrugated iron roofs...">${escapeHtml(loc.sound || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Architectural &amp; Production Design Notes</label>
                        <textarea id="ld-description" class="form-textarea" rows="4" placeholder="Materials, condition (decayed, clinical, lavish), set dressing, practical fixtures...">${escapeHtml(loc.description || '')}</textarea>
                    </div>
                </div>

                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.notes}</span> 3. Dramatic Purpose &amp; Story Notes
                    </h3>
                    <div class="form-group">
                        <label class="form-label">Dramatic Value &amp; Story Significance</label>
                        <textarea id="ld-notes" class="form-textarea" rows="3" placeholder="What emotional resonance does this space carry? Safe haven or hostile territory?">${escapeHtml(loc.notes || '')}</textarea>
                    </div>
                </div>

                <!-- Section 4: Dynamic Linking & Backlinks -->
                <div class="backlinks-panel">
                    <div class="backlinks-header">
                        <h3 class="backlinks-title">
                            <span>${SVG.link}</span> 4. Connected Production Records (Dynamic Links)
                        </h3>
                        <span class="tagline-badge">ONE SOURCE OF TRUTH</span>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <strong style="font-size: 0.85rem; color: var(--cine-cyan); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                            ${SVG.clapper} SCENES SET AT THIS LOCATION (${links.scenes.length}):
                        </strong>
                        <div class="entity-chips-wrap">
                            ${links.scenes.length === 0 ? '<span class="text-muted">No screenplay scenes set here yet</span>' : links.scenes.map(s => `
                                <a href="#/project/${project.id}/scenes" class="entity-chip entity-chip-scene">
                                    ${SVG.clapper} Scene #${s.sceneNumber}: ${escapeHtml(s.heading)}
                                </a>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <strong style="font-size: 0.85rem; color: var(--cine-lime); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                            ${SVG.calendar} SCHEDULED SHOOT DAYS (${links.shootDays.length}):
                        </strong>
                        <div class="entity-chips-wrap">
                            ${links.shootDays.length === 0 ? '<span class="text-muted">Not assigned to any shoot day yet</span>' : links.shootDays.map(d => `
                                <a href="#/project/${project.id}/schedule" class="entity-chip entity-chip-day">
                                    ${SVG.calendar} ${escapeHtml(d.title)} (${d.date})
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="dossier-footer">
                    <span id="loc-save-status" class="save-status-text">Ready</span>
                    <button type="submit" class="btn primary btn-lg">
                        ${SVG.save} Save Location Profile
                    </button>
                </div>
            </form>
        </div>
    `;

    bindLocDetailEvents(container, project, loc);
}

function bindLocDetailEvents(container, project, loc) {
    const form = container.querySelector('#location-detail-form');
    const saveBtn = container.querySelector('#save-location-btn');
    const deleteBtn = container.querySelector('#delete-location-btn');
    const statusText = container.querySelector('#loc-save-status');

    async function saveForm() {
        const nameVal = container.querySelector('#ld-name')?.value.trim().toUpperCase();
        if (!nameVal) {
            container.querySelector('#ld-name')?.focus();
            showToast('Location name cannot be empty', 'warning');
            return;
        }

        const updates = {
            name: nameVal,
            type: container.querySelector('#ld-type')?.value || 'INT.',
            region: container.querySelector('#ld-region')?.value.trim() || '',
            atmosphere: container.querySelector('#ld-atmosphere')?.value.trim() || '',
            sound: container.querySelector('#ld-sound')?.value.trim() || '',
            description: container.querySelector('#ld-description')?.value.trim() || '',
            notes: container.querySelector('#ld-notes')?.value.trim() || '',
        };

        await locations.update(loc.id, updates);
        showToast(`Saved location ${updates.type} ${nameVal}`, 'success');
        if (statusText) statusText.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveForm();
    });

    saveBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        saveForm();
    });

    deleteBtn?.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
            title: `Delete ${loc.name}?`,
            message: 'Are you sure you want to delete this location? Linked scenes will lose their setting association.',
            confirmText: 'Delete Location',
            isDanger: true
        });

        if (confirmed) {
            await locations.delete(loc.id);
            showToast('Location deleted', 'success');
            router.navigate(`/project/${project.id}/locations`);
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
