/**
 * character-detail.js — Comprehensive Character Detail & Profile Editor
 * High-depth multi-section character dossier.
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, characters } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getCharacterLinks } from '../links.js';

const SVG = {
    back: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    badge: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>`,
    brain: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"></path></svg>`,
    eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    trend: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    note: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    clapper: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    prop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    save: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
};

export async function renderCharacterDetail(container, params) {
    const projectId = params.id;
    const charId = params.cid;

    const project = await projects.get(projectId);
    const char = await characters.get(charId);

    if (!project || !char) {
        router.navigate(`/project/${projectId}/characters`);
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Characters', href: `#/project/${project.id}/characters` },
        { label: char.name, href: `#/project/${project.id}/characters/${char.id}` }
    ]);

    // Fetch bidirectional linked records
    const links = await getCharacterLinks(char.id);

    container.innerHTML = `
        <div class="character-detail-view">
            <div class="memphis-bar"></div>

            <!-- Header Bar -->
            <div class="detail-header">
                <div class="detail-header-left">
                    <a href="#/project/${project.id}/characters" class="btn-back">
                        ${SVG.back} Back to Characters
                    </a>
                    <div class="detail-title-group">
                        <div class="detail-avatar">${(char.name || '?')[0].toUpperCase()}</div>
                        <div>
                            <h1 class="detail-title">${escapeHtml(char.name)}</h1>
                            <div class="detail-subtitle">
                                <span class="badge role-${(char.role || 'supporting').toLowerCase()}">${escapeHtml(char.role || 'Supporting')}</span>
                                ${char.fullName ? `<span class="detail-meta-item">Legal: ${escapeHtml(char.fullName)}</span>` : ''}
                                ${char.age ? `<span class="detail-meta-item">Age: ${escapeHtml(char.age)}</span>` : ''}
                                <span class="detail-meta-item" style="color: var(--cine-magenta); font-weight: bold;">Appears in ${links.scenes.length} Scenes</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-header-actions">
                    <button id="delete-character-btn" class="btn secondary danger-text">
                        ${SVG.trash} Delete
                    </button>
                    <button id="save-character-btn" class="btn primary btn-lg">
                        ${SVG.save} Save Changes
                    </button>
                </div>
            </div>

            <!-- Form Body with High-Depth Sections -->
            <form id="character-detail-form" class="character-dossier-form">
                <!-- Section 1: Core Identity -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.badge}</span> 1. Core Identity &amp; Screenplay Cue
                    </h3>
                    
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Screenplay Cue Name (UPPERCASE) <span class="required">*</span></label>
                            <input type="text" id="cd-name" class="form-input uppercase-input" value="${escapeHtml(char.name)}" required />
                            <span class="form-hint">Used for dialogue cues and scene headings in the screenplay.</span>
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Full Legal Name</label>
                            <input type="text" id="cd-fullname" class="form-input" value="${escapeHtml(char.fullName || '')}" placeholder="e.g. Eleanor Vance" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Dramatic Role</label>
                            <select id="cd-role" class="form-select">
                                <option value="Protagonist" ${char.role === 'Protagonist' ? 'selected' : ''}>Protagonist</option>
                                <option value="Antagonist" ${char.role === 'Antagonist' ? 'selected' : ''}>Antagonist</option>
                                <option value="Supporting" ${char.role === 'Supporting' ? 'selected' : ''}>Supporting</option>
                                <option value="Minor" ${char.role === 'Minor' ? 'selected' : ''}>Minor / Cameo</option>
                            </select>
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Age / Apparent Age</label>
                            <input type="text" id="cd-age" class="form-input" value="${escapeHtml(char.age || '')}" placeholder="e.g. 29, Mid-40s" />
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Cast Actor Name</label>
                            <input type="text" id="cd-actor" class="form-input" value="${escapeHtml(char.actorName || '')}" placeholder="e.g. Linda Hamilton" />
                        </div>
                    </div>
                </div>

                <!-- Section 2: Dramatic Engine & Psychology -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.brain}</span> 2. Psychology &amp; Dramatic Engine
                    </h3>

                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">External Goal (Want)</label>
                            <textarea id="cd-goals" class="form-textarea" rows="2" placeholder="What tangible objective does this character fight for throughout the plot?">${escapeHtml(char.goals || '')}</textarea>
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Internal Need (Unconscious Truth)</label>
                            <textarea id="cd-need" class="form-textarea" rows="2" placeholder="What emotional or psychological lesson must they learn to become whole?">${escapeHtml(char.need || '')}</textarea>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Fatal Flaw / Vulnerability</label>
                            <input type="text" id="cd-flaw" class="form-input" value="${escapeHtml(char.flaw || '')}" placeholder="e.g. Blind arrogance, fear of intimacy, cynical detachment" />
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Core Fear</label>
                            <input type="text" id="cd-fear" class="form-input" value="${escapeHtml(char.fear || '')}" placeholder="e.g. Dying alone in obscurity, losing family" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Backstory &amp; Bio</label>
                        <textarea id="cd-bio" class="form-textarea" rows="4" placeholder="Detailed life history, defining traumas, formative experiences, and social background...">${escapeHtml(char.bio || '')}</textarea>
                    </div>
                </div>

                <!-- Section 3: Physicality & Visual Presence -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.eye}</span> 3. Physical Description &amp; Casting Reference
                    </h3>

                    <div class="form-group">
                        <label class="form-label">Physical Appearance &amp; Build</label>
                        <textarea id="cd-physical" class="form-textarea" rows="3" placeholder="Height, posture, facial features, scars, tattoos, physical aura...">${escapeHtml(char.physical || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Wardrobe &amp; Style Profile</label>
                        <textarea id="cd-wardrobe" class="form-textarea" rows="2" placeholder="Signature attire, color palette, worn textures, accessories...">${escapeHtml(char.wardrobe || '')}</textarea>
                    </div>
                </div>

                <!-- Section 4: Dialogue, Voice & Mannerisms -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.chat}</span> 4. Dialogue Traits &amp; Speech Patterns
                    </h3>

                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Speech Rhythm &amp; Vocabulary</label>
                            <input type="text" id="cd-speech-pattern" class="form-input" value="${escapeHtml(char.speechPattern || '')}" placeholder="e.g. Rapid-fire technical jargon, terse monosyllabic sentences" />
                        </div>
                        <div class="form-group flex-1">
                            <label class="form-label">Catchphrases / Verbal Tics</label>
                            <input type="text" id="cd-verbal-tics" class="form-input" value="${escapeHtml(char.verbalTics || '')}" placeholder="e.g. 'Copy that', avoids eye contact when lying" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Sample Dialogue Line</label>
                        <textarea id="cd-sample-dialogue" class="form-textarea" rows="2" placeholder="A quintessential line that immediately captures this character's distinctive voice...">${escapeHtml(char.sampleDialogue || '')}</textarea>
                    </div>
                </div>

                <!-- Section 5: Relationships & Dynamics -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.link}</span> 5. Key Relationships
                    </h3>
                    <div class="form-group">
                        <label class="form-label">Interpersonal Ties &amp; Friction</label>
                        <textarea id="cd-relationships" class="form-textarea" rows="3" placeholder="Describe dynamics with the protagonist, antagonist, and key supporting cast...">${escapeHtml(char.relationships || '')}</textarea>
                    </div>
                </div>

                <!-- Section 6: Character Arc & Evolution -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.trend}</span> 6. Narrative Arc Across Story / Episodes
                    </h3>
                    <div class="form-group">
                        <label class="form-label">Arc &amp; Transformation</label>
                        <textarea id="cd-arc" class="form-textarea" rows="3" placeholder="How does this character begin versus how do they end? What crucial choice do they make at the climax?">${escapeHtml(char.arc || '')}</textarea>
                    </div>
                </div>

                <!-- Section 7: Notes & Development -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.note}</span> 7. Additional Notes
                    </h3>
                    <div class="form-group">
                        <label class="form-label">Writer's Scratchpad &amp; Ideas</label>
                        <textarea id="cd-notes" class="form-textarea" rows="3" placeholder="Unfiltered thoughts, audition ideas, inspiration references...">${escapeHtml(char.notes || '')}</textarea>
                    </div>
                </div>

                <!-- Section 8: Dynamic Linking & Backlinks -->
                <div class="backlinks-panel">
                    <div class="backlinks-header">
                        <h3 class="backlinks-title">
                            <span>${SVG.link}</span> 8. Connected Production Records (Dynamic Links)
                        </h3>
                        <span class="tagline-badge">ONE SOURCE OF TRUTH</span>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <strong style="font-size: 0.85rem; color: var(--cine-cyan); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                            ${SVG.clapper} APPEARS IN SCENES (${links.scenes.length}):
                        </strong>
                        <div class="entity-chips-wrap">
                            ${links.scenes.length === 0 ? '<span class="text-muted">No speaking scenes tagged yet</span>' : links.scenes.map(s => `
                                <a href="#/project/${project.id}/scenes" class="entity-chip entity-chip-scene">
                                    ${SVG.clapper} Scene #${s.sceneNumber}: ${escapeHtml(s.heading)}
                                </a>
                            `).join('')}
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <strong style="font-size: 0.85rem; color: var(--cine-magenta); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                            ${SVG.prop} WARDROBE &amp; HERO PROPS ASSIGNED (${links.breakdownItems.length}):
                        </strong>
                        <div class="entity-chips-wrap">
                            ${links.breakdownItems.length === 0 ? '<span class="text-muted">No wardrobe/props assigned</span>' : links.breakdownItems.map(item => `
                                <span class="dept-tag tag-${item.category}">
                                    ${SVG.prop} ${escapeHtml(item.name)}
                                </span>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <strong style="font-size: 0.85rem; color: var(--cine-yellow); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
                            ${SVG.calendar} CALL SHEETS &amp; SCHEDULES (${links.callSheets.length}):
                        </strong>
                        <div class="entity-chips-wrap">
                            ${links.callSheets.length === 0 ? '<span class="text-muted">No call sheets generated yet</span>' : links.callSheets.map(cs => `
                                <a href="#/project/${project.id}/callsheet" class="entity-chip entity-chip-day">
                                    ${SVG.calendar} ${escapeHtml(cs.title)}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Bottom Sticky Action Bar -->
                <div class="dossier-footer">
                    <span id="save-status" class="save-status-text">All changes saved locally</span>
                    <button type="submit" class="btn primary btn-lg">
                        ${SVG.save} Save Character Profile
                    </button>
                </div>
            </form>
        </div>
    `;

    bindFormEvents(container, project, char);
}

function bindFormEvents(container, project, char) {
    const form = container.querySelector('#character-detail-form');
    const saveBtn = container.querySelector('#save-character-btn');
    const deleteBtn = container.querySelector('#delete-character-btn');
    const statusText = container.querySelector('#save-status');

    async function saveForm() {
        const nameVal = container.querySelector('#cd-name')?.value.trim().toUpperCase();
        if (!nameVal) {
            container.querySelector('#cd-name')?.focus();
            showToast('Character cue name cannot be empty', 'warning');
            return;
        }

        const updates = {
            name: nameVal,
            fullName: container.querySelector('#cd-fullname')?.value.trim() || '',
            role: container.querySelector('#cd-role')?.value || 'Supporting',
            age: container.querySelector('#cd-age')?.value.trim() || '',
            actorName: container.querySelector('#cd-actor')?.value.trim() || '',
            goals: container.querySelector('#cd-goals')?.value.trim() || '',
            need: container.querySelector('#cd-need')?.value.trim() || '',
            flaw: container.querySelector('#cd-flaw')?.value.trim() || '',
            fear: container.querySelector('#cd-fear')?.value.trim() || '',
            bio: container.querySelector('#cd-bio')?.value.trim() || '',
            physical: container.querySelector('#cd-physical')?.value.trim() || '',
            wardrobe: container.querySelector('#cd-wardrobe')?.value.trim() || '',
            speechPattern: container.querySelector('#cd-speech-pattern')?.value.trim() || '',
            verbalTics: container.querySelector('#cd-verbal-tics')?.value.trim() || '',
            sampleDialogue: container.querySelector('#cd-sample-dialogue')?.value.trim() || '',
            relationships: container.querySelector('#cd-relationships')?.value.trim() || '',
            arc: container.querySelector('#cd-arc')?.value.trim() || '',
            notes: container.querySelector('#cd-notes')?.value.trim() || '',
        };

        await characters.update(char.id, updates);
        showToast(`Saved profile for ${nameVal}`, 'success');

        if (statusText) {
            statusText.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
        }
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
            title: `Delete Character ${char.name}?`,
            message: `Are you sure you want to permanently delete this character profile? All linked dialogue references and scene tags will be severed.`,
            confirmText: 'Delete Character',
            isDanger: true
        });

        if (confirmed) {
            await characters.delete(char.id);
            showToast('Character deleted', 'success');
            router.navigate(`/project/${project.id}/characters`);
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
