/**
 * season-manager.js — Season & Episode Manager for Web Series / TV Series
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, seasons, episodes, screenplays } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog, Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    seasons: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    writer: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
};

export async function renderSeasonManager(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Seasons & Episodes', href: `#/project/${project.id}/seasons` }
    ]);

    const allSeasons = await seasons.getByProject(projectId);
    const allEpisodes = await episodes.getByProject(projectId);
    const allScreenplays = await screenplays.getByProject(projectId);

    // Group episodes by seasonId
    const episodesBySeason = {};
    for (const ep of allEpisodes) {
        if (!episodesBySeason[ep.seasonId]) episodesBySeason[ep.seasonId] = [];
        episodesBySeason[ep.seasonId].push(ep);
    }

    container.innerHTML = `
        <div class="season-manager-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Seasons &amp; Episodes</h1>
                    <p class="view-subtitle">Manage narrative arcs, episodes, and episodic screenplays for ${escapeHtml(project.name)}.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-season-btn" class="btn primary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.plus} Add Season
                    </button>
                </div>
            </div>

            <div class="seasons-container" id="seasons-container">
                ${allSeasons.length === 0 ? renderNoSeasonsState() : allSeasons.map((s, idx) => renderSeasonBlock(s, episodesBySeason[s.id] || [], project, allScreenplays)).join('')}
            </div>
        </div>
    `;

    bindSeasonEvents(container, project);
}

function renderNoSeasonsState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-violet);">${SVG.seasons}</div>
            <h2>No Seasons Created</h2>
            <p>Create your first season to organize episodes, story arcs, and writing rooms.</p>
            <button id="create-first-season-btn" class="btn primary btn-lg" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                ${SVG.plus} Create Season 1
            </button>
        </div>
    `;
}

function renderSeasonBlock(season, eps, project, allScreenplays) {
    const sortedEps = [...eps].sort((a, b) => a.order - b.order);

    return `
        <div class="season-card" data-season-id="${season.id}">
            <div class="season-card-header">
                <div class="season-card-title-group">
                    <span class="season-badge">SEASON ${season.order || 1}</span>
                    <h2 class="season-title">${escapeHtml(season.name)}</h2>
                    <span class="season-ep-count">(${sortedEps.length} Episode${sortedEps.length === 1 ? '' : 's'})</span>
                </div>
                <div class="season-card-actions">
                    <button class="btn small secondary add-episode-btn" data-season="${season.id}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                        ${SVG.plus} Add Episode
                    </button>
                    <button class="btn-icon-ghost delete-season-btn" data-season="${season.id}" title="Delete Season">
                        ${SVG.trash}
                    </button>
                </div>
            </div>

            ${season.description ? `<p class="season-desc">${escapeHtml(season.description)}</p>` : ''}

            <div class="episodes-table-wrapper">
                ${sortedEps.length === 0 ? `
                    <div class="no-episodes-hint">No episodes in this season yet. Click "Add Episode" above.</div>
                ` : `
                    <table class="episodes-table">
                        <thead>
                            <tr>
                                <th style="width: 60px;">#</th>
                                <th>Episode Title</th>
                                <th>Logline / Synopsis</th>
                                <th style="width: 120px;">Status</th>
                                <th style="width: 190px; text-align: right;">Screenplay Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedEps.map(ep => {
                                const sp = allScreenplays.find(s => s.episodeId === ep.id);
                                return `
                                    <tr data-episode-id="${ep.id}">
                                        <td class="ep-num-cell">E${ep.order}</td>
                                        <td class="ep-title-cell">
                                            <strong>${escapeHtml(ep.title)}</strong>
                                        </td>
                                        <td class="ep-logline-cell">
                                            <span>${escapeHtml(ep.logline || '—')}</span>
                                        </td>
                                        <td class="ep-status-cell">
                                            <span class="badge status-${ep.status || 'draft'}">${(ep.status || 'draft').toUpperCase()}</span>
                                        </td>
                                        <td class="ep-actions-cell" style="text-align: right;">
                                            <div style="display: inline-flex; align-items: center; gap: 0.35rem; justify-content: flex-end;">
                                                <a href="#/project/${project.id}/season/${season.id}/episode/${ep.id}/writer" class="btn small primary" style="display: inline-flex; align-items: center; gap: 0.3rem;">
                                                    ${SVG.writer} Write
                                                </a>
                                                <button class="btn-icon-ghost edit-episode-btn" data-episode="${ep.id}" title="Edit Episode Info">
                                                    ${SVG.edit}
                                                </button>
                                                <button class="btn-icon-ghost delete-episode-btn" data-episode="${ep.id}" title="Delete Episode">
                                                    ${SVG.trash}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}

function bindSeasonEvents(container, project) {
    // Add Season button
    const addSeasonBtn = container.querySelector('#add-season-btn');
    const firstSeasonBtn = container.querySelector('#create-first-season-btn');

    const handleAddSeason = () => {
        const modal = new Modal({
            title: 'Add New Season',
            content: `
                <div class="form-group">
                    <label class="form-label">Season Name</label>
                    <input type="text" id="modal-season-name" class="form-input" placeholder="e.g. Season 2" />
                </div>
                <div class="form-group">
                    <label class="form-label">Season Arc / Description</label>
                    <textarea id="modal-season-desc" class="form-textarea" rows="3" placeholder="Core narrative conflict of this season..."></textarea>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Season',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const nameInput = document.getElementById('modal-season-name');
                        const descInput = document.getElementById('modal-season-desc');
                        const name = nameInput?.value.trim() || 'New Season';
                        const existing = await seasons.getByProject(project.id);
                        await seasons.create({
                            projectId: project.id,
                            name,
                            order: existing.length + 1,
                            description: descInput?.value.trim() || ''
                        });
                        m.close();
                        showToast(`Season "${name}" created!`, 'success');
                        renderSeasonManager(container, { id: project.id });
                    }
                }
            ]
        });
        modal.open();
    };

    addSeasonBtn?.addEventListener('click', handleAddSeason);
    firstSeasonBtn?.addEventListener('click', handleAddSeason);

    // Delete Season
    container.querySelectorAll('.delete-season-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const seasonId = btn.getAttribute('data-season');
            const confirmed = await confirmDialog({
                title: 'Delete Season',
                message: 'Are you sure you want to delete this season and all its episodes? This cannot be undone.',
                confirmText: 'Delete Season',
                isDanger: true
            });
            if (confirmed) {
                await seasons.delete(seasonId);
                showToast('Season deleted', 'success');
                renderSeasonManager(container, { id: project.id });
            }
        });
    });

    // Add Episode
    container.querySelectorAll('.add-episode-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const seasonId = btn.getAttribute('data-season');
            const allEps = await episodes.getByProject(project.id);
            const seasonEps = allEps.filter(e => e.seasonId === seasonId);
            const nextOrder = seasonEps.length + 1;

            const modal = new Modal({
                title: 'Add Episode',
                content: `
                    <div class="form-group">
                        <label class="form-label">Episode Title</label>
                        <input type="text" id="modal-ep-title" class="form-input" placeholder="e.g. Episode ${nextOrder}" value="Episode ${nextOrder}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Episode Logline</label>
                        <textarea id="modal-ep-logline" class="form-textarea" rows="2" placeholder="Brief premise of this episode..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="modal-ep-status" class="form-select">
                            <option value="draft" selected>Draft</option>
                            <option value="in_progress">In Progress</option>
                            <option value="complete">Complete</option>
                        </select>
                    </div>
                `,
                actions: [
                    { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                    {
                        label: 'Create Episode',
                        class: 'primary',
                        onClick: async (_, m) => {
                            const title = document.getElementById('modal-ep-title')?.value.trim() || `Episode ${nextOrder}`;
                            const logline = document.getElementById('modal-ep-logline')?.value.trim() || '';
                            const status = document.getElementById('modal-ep-status')?.value || 'draft';

                            const ep = await episodes.create({
                                projectId: project.id,
                                seasonId,
                                order: nextOrder,
                                title,
                                logline,
                                status
                            });

                            // Create initial screenplay for the episode
                            await screenplays.create({
                                projectId: project.id,
                                episodeId: ep.id,
                                title: `${project.name} — ${title}`,
                                content: `Title: ${project.name.toUpperCase()} - ${title.toUpperCase()}\nAuthor: Cinecore\n\nEXT. SCENE START - DAY\n\nEpisode begins.\n`
                            });

                            m.close();
                            showToast(`Episode "${title}" created!`, 'success');
                            renderSeasonManager(container, { id: project.id });
                        }
                    }
                ]
            });
            modal.open();
        });
    });

    // Delete Episode
    container.querySelectorAll('.delete-episode-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const epId = btn.getAttribute('data-episode');
            const confirmed = await confirmDialog({
                title: 'Delete Episode',
                message: 'Are you sure you want to delete this episode and its screenplay?',
                confirmText: 'Delete Episode',
                isDanger: true
            });
            if (confirmed) {
                await episodes.delete(epId);
                showToast('Episode deleted', 'success');
                renderSeasonManager(container, { id: project.id });
            }
        });
    });

    // Edit Episode Info
    container.querySelectorAll('.edit-episode-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const epId = btn.getAttribute('data-episode');
            const ep = await episodes.get(epId);
            if (!ep) return;

            const modal = new Modal({
                title: `Edit Episode: ${ep.title}`,
                content: `
                    <div class="form-group">
                        <label class="form-label">Episode Title</label>
                        <input type="text" id="edit-ep-title" class="form-input" value="${escapeHtml(ep.title)}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Episode Order (#)</label>
                        <input type="number" id="edit-ep-order" class="form-input" value="${ep.order}" min="1" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Episode Logline</label>
                        <textarea id="edit-ep-logline" class="form-textarea" rows="2">${escapeHtml(ep.logline || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="edit-ep-status" class="form-select">
                            <option value="draft" ${ep.status === 'draft' ? 'selected' : ''}>Draft</option>
                            <option value="in_progress" ${ep.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="complete" ${ep.status === 'complete' ? 'selected' : ''}>Complete</option>
                        </select>
                    </div>
                `,
                actions: [
                    { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                    {
                        label: 'Save Changes',
                        class: 'primary',
                        onClick: async (_, m) => {
                            const newTitle = document.getElementById('edit-ep-title')?.value.trim() || ep.title;
                            const newOrder = parseInt(document.getElementById('edit-ep-order')?.value, 10) || ep.order;
                            const newLogline = document.getElementById('edit-ep-logline')?.value.trim() || '';
                            const newStatus = document.getElementById('edit-ep-status')?.value || ep.status;

                            await episodes.update(ep.id, {
                                title: newTitle,
                                order: newOrder,
                                logline: newLogline,
                                status: newStatus
                            });

                            m.close();
                            showToast('Episode updated', 'success');
                            renderSeasonManager(container, { id: project.id });
                        }
                    }
                ]
            });
            modal.open();
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
