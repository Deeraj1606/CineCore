/**
 * callsheet.js — Production Call Sheets with Draft vs. Published States for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, shootDays, callSheets } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { getShootDayLinks, generateOrReviseCallSheet } from '../links.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    callsheet: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    calendar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    print: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
    alert: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    hospital: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line><circle cx="12" cy="12" r="10"></circle></svg>`
};

export async function renderCallSheet(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Production Call Sheets', href: `#/project/${project.id}/callsheet` }
    ]);

    const allDays = await shootDays.getByProject(projectId);

    // If no shoot days exist yet, provide prompt to setup days
    if (allDays.length === 0) {
        container.innerHTML = `
            <div class="callsheet-view">
                <div class="empty-state-card">
                    <div class="empty-state-icon" style="color: var(--cine-lime);">${SVG.callsheet}</div>
                    <h2>No Shoot Days Scheduled</h2>
                    <p>Create shoot days in the Stripboard scheduler to generate connected, reliable call sheets.</p>
                    <a href="#/project/${project.id}/schedule" class="btn primary btn-lg" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        ${SVG.calendar} Open Stripboard Schedule
                    </a>
                </div>
            </div>
        `;
        return;
    }

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const activeDayId = urlParams.get('day') || allDays[0].id;
    const currentDay = allDays.find(d => d.id === activeDayId) || allDays[0];

    // Fetch shoot day details and call sheet
    let dayData = await getShootDayLinks(currentDay.id);

    // If no call sheet exists for day, auto-generate initial draft
    if (!dayData.callSheet) {
        await generateOrReviseCallSheet(projectId, currentDay.id);
        dayData = await getShootDayLinks(currentDay.id);
    }

    const sheet = dayData.callSheet;
    const scheduled = dayData.scheduledScenes;
    const isStale = dayData.isStale;

    container.innerHTML = `
        <div class="callsheet-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">${escapeHtml(project.name)} — Call Sheet</h1>
                    <p class="view-subtitle">Official daily production dispatch derived from scheduled scenes, locations, and cast calls.</p>
                </div>
                <div class="view-header-actions">
                    ${sheet.isPublished ? `
                        <button id="revise-sheet-btn" class="btn secondary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                            ${SVG.plus} Create Revision (Rev ${(sheet.version || 1) + 1})
                        </button>
                    ` : `
                        <button id="publish-sheet-btn" class="btn primary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                            ${SVG.check} Publish Call Sheet (Rev ${sheet.version || 1})
                        </button>
                    `}
                    <button id="print-sheet-btn" class="btn secondary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.print} Print Production Sheet
                    </button>
                </div>
            </div>

            <!-- Shoot Day Selector Pills -->
            <div class="characters-filter-bar">
                <div class="role-filter-pills">
                    ${allDays.map(d => `
                        <button class="role-pill ${d.id === currentDay.id ? 'active' : ''}" data-day="${d.id}">
                            ${escapeHtml(d.title)} (${d.date})
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Stale Alert Banner if schedule changed post-publish -->
            ${isStale ? `
                <div class="stale-warning-banner">
                    <div class="stale-warning-text" style="display: flex; align-items: center; gap: 0.6rem;">
                        <span style="color: var(--cine-yellow);">${SVG.alert}</span>
                        <span><strong>Schedule Modified:</strong> The schedule for ${escapeHtml(currentDay.title)} was changed after this call sheet was published. Click "Create Revision" to review and publish Rev ${(sheet.version || 1) + 1}.</span>
                    </div>
                    <button id="banner-revise-btn" class="btn small primary">Create Revision</button>
                </div>
            ` : ''}

            <!-- Printable Production Paper Sheet -->
            <div class="callsheet-paper" id="printable-callsheet">
                <!-- Header Block -->
                <div class="callsheet-header-grid">
                    <div>
                        <div class="tagline-badge" style="margin-bottom: 0.5rem;">CINECORE PRODUCTION DISPATCH</div>
                        <h2 class="callsheet-title-main">${escapeHtml(project.name.toUpperCase())}</h2>
                        <p class="callsheet-sub-info">
                            <strong>${escapeHtml(currentDay.title.toUpperCase())}</strong> • ${sheet.date || currentDay.date}
                        </p>
                    </div>

                    <div class="callsheet-meta-block">
                        <span class="callsheet-status-tag ${sheet.isPublished ? 'status-published' : 'status-draft-cs'}">
                            ${sheet.isPublished ? `PUBLISHED (REV ${sheet.version})` : `DRAFT (REV ${sheet.version})`}
                        </span>
                        <div><strong>CREW CALL:</strong> ${sheet.generalCall || '07:00 AM'}</div>
                        <div><strong>BREAKFAST:</strong> ${sheet.breakfast || '06:30 AM'}</div>
                        <div><strong>EST. WRAP:</strong> ${sheet.estimatedWrap || '07:00 PM'}</div>
                    </div>
                </div>

                <!-- Emergency, Location & Weather Row -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="callsheet-note-box">
                        <strong style="display: inline-flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                            ${SVG.pin} PRIMARY SHOOTING LOCATION:
                        </strong><br>
                        ${escapeHtml(sheet.locationAddress || currentDay.locationName || 'Main Soundstage / On Location')}<br>
                        <small style="color: #6b6480;">${escapeHtml(sheet.parkingNotes || 'Crew parking available on-site.')}</small>
                    </div>
                    <div class="callsheet-note-box">
                        <strong style="display: inline-flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                            ${SVG.hospital} NEAREST EMERGENCY HOSPITAL:
                        </strong><br>
                        ${escapeHtml(sheet.hospital || 'General Hospital Trauma Center')}<br>
                        <small style="color: #6b6480;">Weather: ${escapeHtml(sheet.weather || 'Clear • 72°F')}</small>
                    </div>
                </div>

                <!-- Scheduled Scenes Table -->
                <div class="callsheet-section-title">SCHEDULED SCENES (${scheduled.length})</div>
                <table class="callsheet-table">
                    <thead>
                        <tr>
                            <th style="width: 70px;">SCN #</th>
                            <th style="width: 80px;">I / E</th>
                            <th>SLUGLINE &amp; DESCRIPTION</th>
                            <th style="width: 90px;">DAY/NIGHT</th>
                            <th style="width: 80px;">PAGES</th>
                            <th>CAST ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scheduled.length === 0 ? `
                            <tr><td colspan="6" style="text-align: center; color: #827c9b; padding: 1.5rem;">No scenes scheduled for this day yet.</td></tr>
                        ` : scheduled.map(item => `
                            <tr>
                                <td><strong>#${item.scene?.sceneNumber || '—'}</strong></td>
                                <td>${item.scene?.intExt || 'INT.'}</td>
                                <td>
                                    <strong>${escapeHtml(item.scene?.heading || 'Untitled Scene')}</strong>
                                    ${item.independentNotes ? `<br><small style="color: #713BFF;">Note: ${escapeHtml(item.independentNotes)}</small>` : ''}
                                </td>
                                <td>${item.scene?.timeOfDay || 'DAY'}</td>
                                <td>${item.scene?.estPages || '1/8'}</td>
                                <td>
                                    ${(item.characters || []).map(c => `<span style="font-weight: 700; color: #17142D;">${escapeHtml(c.name)}</span>`).join(', ') || '—'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Cast Call Time Matrix -->
                <div class="callsheet-section-title">CAST CALL MATRIX</div>
                <table class="callsheet-table">
                    <thead>
                        <tr>
                            <th>CHARACTER</th>
                            <th>ACTOR / CONTACT</th>
                            <th style="width: 110px;">PICKUP</th>
                            <th style="width: 110px;">H/MU &amp; WARD</th>
                            <th style="width: 110px;">ON SET</th>
                            <th>SCENES &amp; SPECIAL NOTES</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(sheet.castCalls || []).length === 0 ? `
                            <tr><td colspan="6" style="text-align: center; color: #827c9b; padding: 1.5rem;">No cast members assigned yet.</td></tr>
                        ` : (sheet.castCalls || []).map(c => `
                            <tr>
                                <td><strong>${escapeHtml(c.characterName)}</strong></td>
                                <td>${escapeHtml(c.actorName || 'TBD')}</td>
                                <td>${escapeHtml(c.callTime || '07:00 AM')}</td>
                                <td>07:30 AM</td>
                                <td><strong>${escapeHtml(c.onSetTime || '08:00 AM')}</strong></td>
                                <td>${escapeHtml(c.notes || '—')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- General Instructions & Notes -->
                <div class="callsheet-section-title">PRODUCTION NOTES &amp; INSTRUCTIONS</div>
                <div class="callsheet-note-box">
                    ${escapeHtml(sheet.generalNotes || 'Closed set. All departments check in with 1st AD upon arrival. Wireless quiet during takes.')}
                </div>
            </div>
        </div>
    `;

    bindCallSheetEvents(container, project, currentDay, sheet);
}

function bindCallSheetEvents(container, project, currentDay, sheet) {
    // Switch shoot day
    container.querySelectorAll('.role-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const dayId = pill.getAttribute('data-day');
            window.location.hash = `#/project/${project.id}/callsheet?day=${dayId}`;
        });
    });

    // Print call sheet
    container.querySelector('#print-sheet-btn')?.addEventListener('click', () => {
        window.print();
    });

    // Publish call sheet
    container.querySelector('#publish-sheet-btn')?.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
            title: `Publish Call Sheet (Rev ${sheet.version || 1})?`,
            message: `Publishing marks this call sheet as the official distributed record for ${currentDay.title}. It will be locked from silent schedule overrides.`,
            confirmText: 'Publish Now'
        });

        if (confirmed) {
            await callSheets.update(sheet.id, {
                isPublished: true,
                publishedAt: Date.now()
            });
            showToast(`Call Sheet for ${currentDay.title} published!`, 'success');
            renderCallSheet(container, { id: project.id });
        }
    });

    // Create revision handlers
    const handleRevision = async () => {
        const confirmed = await confirmDialog({
            title: `Create Revision ${sheet.version + 1}?`,
            message: `This will create a new editable draft (Rev ${sheet.version + 1}) incorporating all latest schedule changes, while keeping Rev ${sheet.version} preserved in project history.`,
            confirmText: `Create Rev ${sheet.version + 1}`
        });

        if (confirmed) {
            await generateOrReviseCallSheet(project.id, currentDay.id, true);
            showToast(`Call Sheet Rev ${sheet.version + 1} generated!`, 'success');
            renderCallSheet(container, { id: project.id });
        }
    };

    container.querySelector('#revise-sheet-btn')?.addEventListener('click', handleRevision);
    container.querySelector('#banner-revise-btn')?.addEventListener('click', handleRevision);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
