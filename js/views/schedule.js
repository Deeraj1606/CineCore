/**
 * schedule.js — Production Schedule & Interactive Stripboard for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, scenes, shootDays, schedules, locations } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { Modal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    callsheet: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

export async function renderSchedule(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Production Schedule & Stripboard', href: `#/project/${project.id}/schedule` }
    ]);

    const allScenes = await scenes.getByProject(projectId);
    const allDays = await shootDays.getByProject(projectId);
    const allSchedules = await schedules.getByProject(projectId);
    const allLocs = await locations.getByProject(projectId);

    const sceneMap = new Map(allScenes.map(s => [s.id, s]));
    const scheduledSceneIds = new Set(allSchedules.map(s => s.sceneId));
    const unscheduledScenes = allScenes.filter(s => !scheduledSceneIds.has(s.id));

    // Group schedules by shootDayId
    const schedulesByDay = new Map();
    for (const day of allDays) {
        schedulesByDay.set(day.id, []);
    }
    for (const entry of allSchedules) {
        if (schedulesByDay.has(entry.shootDayId)) {
            schedulesByDay.get(entry.shootDayId).push({
                ...entry,
                scene: sceneMap.get(entry.sceneId)
            });
        }
    }

    container.innerHTML = `
        <div class="schedule-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Production Schedule &amp; Stripboard</h1>
                    <p class="view-subtitle">Organize shooting days, banner breaks, location groupings, and day/night scene strips.</p>
                </div>
                <div class="view-header-actions">
                    <button class="btn primary" id="add-shoot-day-btn" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.plus} Add Shoot Day
                    </button>
                    <a href="#/project/${project.id}/callsheet" class="btn secondary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.callsheet} View Call Sheets
                    </a>
                </div>
            </div>

            <!-- Stripboard Body -->
            <div class="stripboard-container" id="stripboard-wrapper">
                ${allDays.length === 0 ? renderNoDays(project, allScenes) : allDays.map(day => renderShootDayBlock(day, schedulesByDay.get(day.id) || [], project, unscheduledScenes)).join('')}
            </div>

            <!-- Unscheduled Scenes Pool -->
            <div class="unscheduled-pool-section">
                <div class="section-header-row">
                    <h3 class="section-title">Unscheduled Scenes Pool (${unscheduledScenes.length})</h3>
                </div>
                ${unscheduledScenes.length === 0 ? `
                    <div style="font-size: 0.85rem; color: var(--app-text-muted);">All project scenes have been assigned to shooting days!</div>
                ` : `
                    <div class="unscheduled-chips-grid">
                        ${unscheduledScenes.map(s => `
                            <div class="unscheduled-scene-chip">
                                <strong>#${s.sceneNumber}</strong> ${escapeHtml(s.heading)}
                                <button class="btn small primary assign-scene-quick-btn" data-scene-id="${s.id}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                    ${SVG.plus} Schedule
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    bindScheduleEvents(container, project, allDays, allScenes, allLocs);
}

function renderNoDays(project, allScenes) {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-blue);">${SVG.calendar}</div>
            <h2>No Shoot Days Created</h2>
            <p>Start your production planning. Create Shoot Day 1, specify call times and locations, and sequence scene strips onto the stripboard.</p>
            <button id="create-first-day-btn" class="btn primary btn-lg" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                ${SVG.plus} Create Shoot Day 1
            </button>
        </div>
    `;
}

function renderShootDayBlock(day, strips, project, unscheduledScenes) {
    const totalMins = strips.reduce((acc, s) => acc + (s.estMinutes || 60), 0);
    const estHours = (totalMins / 60).toFixed(1);

    return `
        <div class="strip-day-card" data-day-id="${day.id}">
            <!-- Day Banner -->
            <div class="strip-day-divider">
                <div>
                    <span class="day-label">${escapeHtml(day.title.toUpperCase())} • ${day.date}</span>
                    <span class="day-meta-sub">
                        Call: ${day.callTime || '07:00'} • Wrap: ${day.estimatedWrap || '19:00'} • ${strips.length} Scenes • ~${estHours} hrs
                    </span>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <a href="#/project/${project.id}/callsheet?day=${day.id}" class="btn small secondary" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                        ${SVG.callsheet} Call Sheet
                    </a>
                    <button class="btn small primary add-strip-btn" data-day-id="${day.id}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                        ${SVG.plus} Add Scene Strip
                    </button>
                    <button class="btn-icon-ghost delete-day-btn" data-day-id="${day.id}" title="Delete Shoot Day">
                        ${SVG.trash}
                    </button>
                </div>
            </div>

            <!-- Scene Strips -->
            <div class="day-strips-list">
                ${strips.length === 0 ? `
                    <div class="empty-strip-hint">No scene strips assigned to this day yet. Click "Add Scene Strip" above.</div>
                ` : strips.map((s, idx) => {
                    const scn = s.scene;
                    const isNight = scn?.timeOfDay === 'NIGHT';
                    const isExt = scn?.intExt === 'EXT.';
                    const stripClass = isExt ? (isNight ? 'strip-ext-night' : 'strip-ext-day') : (isNight ? 'strip-int-night' : 'strip-int-day');

                    return `
                        <div class="strip-item ${stripClass}" data-schedule-id="${s.id}">
                            <span class="strip-cell strip-scene">#${scn?.sceneNumber || idx + 1}</span>
                            <span class="strip-cell strip-ie">${scn?.intExt || 'INT.'}</span>
                            <span class="strip-cell strip-setting">
                                <strong>${escapeHtml(scn?.heading || 'Scene')}</strong>
                                ${s.independentNotes ? `<small style="display:block; color: var(--cine-violet); font-size: 0.72rem;">${escapeHtml(s.independentNotes)}</small>` : ''}
                            </span>
                            <span class="strip-cell strip-tod">${scn?.timeOfDay || 'DAY'}</span>
                            <span class="strip-cell strip-pages">${scn?.estPages || '1/8'} pgs</span>
                            <span class="strip-cell strip-pages">${s.estMinutes || 60}m</span>
                            <div style="display: flex; gap: 0.25rem;">
                                <a href="#/project/${project.id}/scenes" class="btn small secondary" style="padding: 2px 6px; font-size: 0.7rem;">Scene</a>
                                <button class="btn-icon-ghost remove-strip-btn" data-id="${s.id}" title="Remove from Day">
                                    ${SVG.trash}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function bindScheduleEvents(container, project, allDays, allScenes, allLocs) {
    const openAddDayModal = () => {
        const nextNum = allDays.length + 1;
        const modal = new Modal({
            title: `Create Shoot Day ${nextNum}`,
            size: 'medium',
            content: `
                <div class="form-row">
                    <div class="form-group" style="width: 120px;">
                        <label class="form-label">Day #</label>
                        <input type="number" id="modal-day-num" class="form-input" value="${nextNum}" min="1" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Date</label>
                        <input type="date" id="modal-day-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Call Time</label>
                        <input type="time" id="modal-day-call" class="form-input" value="07:00" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Estimated Wrap</label>
                        <input type="time" id="modal-day-wrap" class="form-input" value="19:00" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Primary Location / Soundstage</label>
                    <select id="modal-day-loc" class="form-select">
                        <option value="">None / On Location</option>
                        ${allLocs.map(l => `<option value="${l.id}">${escapeHtml(l.name)} (${l.type})</option>`).join('')}
                    </select>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Shoot Day',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const dayNum = parseInt(document.getElementById('modal-day-num')?.value, 10) || nextNum;
                        const date = document.getElementById('modal-day-date')?.value || new Date().toISOString().split('T')[0];
                        const callTime = document.getElementById('modal-day-call')?.value || '07:00';
                        const wrapTime = document.getElementById('modal-day-wrap')?.value || '19:00';
                        const locId = document.getElementById('modal-day-loc')?.value || null;

                        await shootDays.create({
                            projectId: project.id,
                            dayNumber: dayNum,
                            date,
                            callTime,
                            estimatedWrap: wrapTime,
                            title: `Shoot Day ${dayNum}`,
                            locationId: locId
                        });

                        m.close();
                        showToast(`Shoot Day ${dayNum} created!`, 'success');
                        renderSchedule(container, { id: project.id });
                    }
                }
            ]
        });
        modal.open();
    };

    container.querySelector('#add-shoot-day-btn')?.addEventListener('click', openAddDayModal);
    container.querySelector('#create-first-day-btn')?.addEventListener('click', openAddDayModal);

    // Quick assign from unscheduled pool
    container.querySelectorAll('.assign-scene-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scnId = btn.getAttribute('data-scene-id');
            if (allDays.length === 0) {
                showToast('Please create a shoot day first', 'warning');
                return;
            }

            const modal = new Modal({
                title: 'Assign Scene to Shoot Day',
                content: `
                    <div class="form-group">
                        <label class="form-label">Choose Shoot Day</label>
                        <select id="quick-assign-day" class="form-select">
                            ${allDays.map(d => `<option value="${d.id}">${escapeHtml(d.title)} (${d.date})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Estimated Minutes</label>
                        <input type="number" id="quick-assign-mins" class="form-input" value="60" min="15" step="15" />
                    </div>
                `,
                actions: [
                    { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                    {
                        label: 'Assign Strip',
                        class: 'primary',
                        onClick: async (_, m) => {
                            const dayId = document.getElementById('quick-assign-day')?.value;
                            const mins = parseInt(document.getElementById('quick-assign-mins')?.value, 10) || 60;
                            const existing = await schedules.getByShootDay(dayId);

                            await schedules.create({
                                projectId: project.id,
                                shootDayId: dayId,
                                sceneId: scnId,
                                order: existing.length + 1,
                                estMinutes: mins
                            });

                            m.close();
                            showToast('Scene assigned to schedule!', 'success');
                            renderSchedule(container, { id: project.id });
                        }
                    }
                ]
            });
            modal.open();
        });
    });

    // Add Scene Strip to Day
    container.querySelectorAll('.add-strip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dayId = btn.getAttribute('data-day-id');
            const day = allDays.find(d => d.id === dayId);

            const modal = new Modal({
                title: `Add Scene Strip to ${day?.title || 'Shoot Day'}`,
                size: 'medium',
                content: `
                    <div class="form-group">
                        <label class="form-label">Select Scene <span class="required">*</span></label>
                        <select id="modal-strip-scene" class="form-select">
                            ${allScenes.map(s => `
                                <option value="${s.id}">Scene #${s.sceneNumber}: ${escapeHtml(s.heading)} (${s.intExt} ${s.timeOfDay})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label class="form-label">Estimated Shooting Time (Minutes)</label>
                            <input type="number" id="modal-strip-mins" class="form-input" value="60" min="15" step="15" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Scheduling Notes (Preserved independently)</label>
                        <input type="text" id="modal-strip-notes" class="form-input" placeholder="e.g. Shoot before lunch; requires smoke machine setup" />
                    </div>
                `,
                actions: [
                    { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                    {
                        label: 'Add to Day',
                        class: 'primary',
                        onClick: async (_, m) => {
                            const sceneId = document.getElementById('modal-strip-scene')?.value;
                            const mins = parseInt(document.getElementById('modal-strip-mins')?.value, 10) || 60;
                            const notes = document.getElementById('modal-strip-notes')?.value.trim() || '';

                            const existing = await schedules.getByShootDay(dayId);
                            await schedules.create({
                                projectId: project.id,
                                shootDayId: dayId,
                                sceneId,
                                order: existing.length + 1,
                                estMinutes: mins,
                                independentNotes: notes
                            });

                            m.close();
                            showToast('Scene strip added to schedule!', 'success');
                            renderSchedule(container, { id: project.id });
                        }
                    }
                ]
            });
            modal.open();
        });
    });

    // Remove strip
    container.querySelectorAll('.remove-strip-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sid = btn.getAttribute('data-id');
            await schedules.delete(sid);
            showToast('Scene strip removed from day', 'info');
            renderSchedule(container, { id: project.id });
        });
    });

    // Delete day
    container.querySelectorAll('.delete-day-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const dayId = btn.getAttribute('data-day-id');
            const confirmed = await confirmDialog({
                title: 'Delete Shoot Day?',
                message: 'Are you sure you want to delete this shoot day? All assigned scene strips will return to the unscheduled pool.',
                confirmText: 'Delete Day',
                isDanger: true
            });
            if (confirmed) {
                await shootDays.delete(dayId);
                showToast('Shoot day deleted', 'success');
                renderSchedule(container, { id: project.id });
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
