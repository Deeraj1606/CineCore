/**
 * settings.js — Project Settings & Data Management for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import {
    projects, seasons, episodes, screenplays, scenes,
    characters, locations, breakdownItems, storyboards,
    shots, shootDays, schedules, callSheets, moodboards,
    tasks, documents, analysisCandidates
} from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    upload: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
    alert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    save: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
};

export async function renderSettings(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Settings', href: `#/project/${project.id}/settings` }
    ]);

    container.innerHTML = `
        <div class="settings-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Project Settings</h1>
                    <p class="view-subtitle">Manage project metadata, workspace backups, and configuration for ${escapeHtml(project.name)}.</p>
                </div>
            </div>

            <div class="settings-sections">
                <!-- General Info -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.settings}</span> General Information
                    </h3>
                    <form id="project-settings-form">
                        <div class="form-group">
                            <label class="form-label">Project Name</label>
                            <input type="text" id="set-name" class="form-input" value="${escapeHtml(project.name)}" required />
                        </div>

                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label class="form-label">Project Type</label>
                                <input type="text" class="form-input disabled-input" value="${(project.type || 'film').toUpperCase()}" disabled />
                            </div>
                            <div class="form-group flex-1">
                                <label class="form-label">Genre</label>
                                <input type="text" id="set-genre" class="form-input" value="${escapeHtml(project.genre || '')}" placeholder="e.g. Sci-Fi, Psychological Thriller" />
                            </div>
                            <div class="form-group flex-1">
                                <label class="form-label">Status</label>
                                <select id="set-status" class="form-select">
                                    <option value="development" ${project.status === 'development' ? 'selected' : ''}>Development</option>
                                    <option value="writing" ${project.status === 'writing' ? 'selected' : ''}>Writing</option>
                                    <option value="pre-production" ${project.status === 'pre-production' ? 'selected' : ''}>Pre-Production</option>
                                    <option value="production" ${project.status === 'production' ? 'selected' : ''}>Production</option>
                                    <option value="post-production" ${project.status === 'post-production' ? 'selected' : ''}>Post-Production</option>
                                    <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Logline / Premise</label>
                            <textarea id="set-logline" class="form-textarea" rows="3" placeholder="A single sentence encapsulating the protagonist, core conflict, and stakes...">${escapeHtml(project.logline || '')}</textarea>
                        </div>

                        <button type="submit" class="btn primary">
                            ${SVG.save} Save Project Settings
                        </button>
                    </form>
                </div>

                <!-- Export & Backup -->
                <div class="dossier-section">
                    <h3 class="dossier-section-title">
                        <span class="section-icon">${SVG.download}</span> Export &amp; Backup
                    </h3>
                    <p class="section-hint-text">Export screenplay files to standard industry formats or download a complete JSON backup of the entire project workspace.</p>
                    <div class="export-actions-row">
                        <button id="export-fountain-btn" class="btn secondary">
                            ${SVG.download} Export Fountain (.fountain)
                        </button>
                        <button id="export-txt-btn" class="btn secondary">
                            ${SVG.download} Export Plain Text (.txt)
                        </button>
                        <button id="export-json-btn" class="btn secondary">
                            ${SVG.download} Export Full Workspace Backup (JSON)
                        </button>
                        <label class="btn secondary" style="cursor: pointer; margin: 0;">
                            ${SVG.upload} Restore Backup (JSON)
                            <input type="file" id="import-json-input" accept=".json" style="display: none;" />
                        </label>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="dossier-section danger-zone-section">
                    <h3 class="dossier-section-title danger-text">
                        <span class="section-icon">${SVG.alert}</span> Danger Zone
                    </h3>
                    <p class="section-hint-text">Permanently delete this project along with all associated screenplays, character bibles, locations, storyboards, and production logs. This action cannot be undone.</p>
                    <button id="delete-project-btn" class="btn danger">
                        ${SVG.trash} Permanently Delete Project
                    </button>
                </div>
            </div>
        </div>
    `;

    bindSettingsEvents(container, project);
}

function bindSettingsEvents(container, project) {
    const form = container.querySelector('#project-settings-form');
    const deleteBtn = container.querySelector('#delete-project-btn');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = container.querySelector('#set-name')?.value.trim();
        const newGenre = container.querySelector('#set-genre')?.value.trim();
        const newStatus = container.querySelector('#set-status')?.value;
        const newLogline = container.querySelector('#set-logline')?.value.trim();

        if (!newName) {
            container.querySelector('#set-name')?.focus();
            return;
        }

        const updated = await projects.update(project.id, {
            name: newName,
            genre: newGenre,
            status: newStatus,
            logline: newLogline
        });

        appState.set('currentProject', updated);
        showToast('Project settings saved successfully', 'success');
    });

    deleteBtn?.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
            title: `Delete ${project.name}?`,
            message: 'Are you absolutely sure you want to delete this project? All screenplays, seasons, episodes, and databases will be permanently destroyed.',
            confirmText: 'Yes, Delete Project',
            isDanger: true
        });

        if (confirmed) {
            await projects.delete(project.id);
            showToast('Project deleted', 'success');
            router.navigate('/');
        }
    });

    // Export Fountain
    container.querySelector('#export-fountain-btn')?.addEventListener('click', async () => {
        const allSp = await screenplays.getByProject(project.id);
        const sp = allSp[0];
        if (!sp || !sp.content) {
            showToast('No screenplay content found to export', 'warning');
            return;
        }
        downloadFile(`${project.name.replace(/\s+/g, '_')}.fountain`, sp.content, 'text/plain');
        showToast('Fountain script downloaded', 'success');
    });

    // Export Plain Text
    container.querySelector('#export-txt-btn')?.addEventListener('click', async () => {
        const allSp = await screenplays.getByProject(project.id);
        const sp = allSp[0];
        if (!sp || !sp.content) {
            showToast('No screenplay content found to export', 'warning');
            return;
        }
        downloadFile(`${project.name.replace(/\s+/g, '_')}.txt`, sp.content, 'text/plain');
        showToast('Plain text script downloaded', 'success');
    });

    // Export Full Workspace Backup (Comprehensive)
    container.querySelector('#export-json-btn')?.addEventListener('click', async () => {
        const isSeries = (project.type || '').includes('series');
        const [
            allSeasons,
            allEpisodes,
            allScreenplays,
            allScenes,
            allCharacters,
            allLocations,
            allStoryboards,
            allShots,
            allCallSheets,
            allMoodboards,
            allTasks,
            allDocs
        ] = await Promise.all([
            isSeries ? seasons.getByProject(project.id) : Promise.resolve([]),
            isSeries ? episodes.getByProject(project.id) : Promise.resolve([]),
            screenplays.getByProject(project.id),
            scenes.getByProject(project.id),
            characters.getByProject(project.id),
            locations.getByProject(project.id),
            storyboards.getByProject(project.id),
            shots.getByProject(project.id),
            callSheets.getByProject(project.id),
            moodboards.getByProject(project.id),
            tasks.getByProject(project.id),
            documents.getByProject(project.id)
        ]);

        const backupData = {
            cinecoreVersion: '2.0',
            exportedAt: new Date().toISOString(),
            project,
            seasons: allSeasons,
            episodes: allEpisodes,
            screenplays: allScreenplays,
            scenes: allScenes,
            characters: allCharacters,
            locations: allLocations,
            storyboards: allStoryboards,
            shots: allShots,
            callSheets: allCallSheets,
            moodboards: allMoodboards,
            tasks: allTasks,
            documents: allDocs
        };

        const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_cinecore_backup.json`;
        downloadFile(filename, JSON.stringify(backupData, null, 2), 'application/json');
        showToast('Complete project workspace backup exported!', 'success');
    });

    // Restore Backup JSON
    const importInput = container.querySelector('#import-json-input');
    importInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.project && !data.cinecoreVersion) {
                showToast('Invalid CINECORE backup file format', 'error');
                return;
            }

            const confirmed = await confirmDialog({
                title: 'Restore Project Workspace?',
                message: `This will restore items from backup into "${project.name}". Existing entities with conflicting IDs will be overwritten.`,
                confirmText: 'Restore Workspace',
                isDanger: false
            });

            if (!confirmed) return;

            // Restore collections
            const restoreList = async (storeObj, items) => {
                if (Array.isArray(items)) {
                    for (const item of items) {
                        item.projectId = project.id;
                        await storeObj.put(item);
                    }
                }
            };

            await Promise.all([
                restoreList(seasons, data.seasons),
                restoreList(episodes, data.episodes),
                restoreList(screenplays, data.screenplays),
                restoreList(scenes, data.scenes),
                restoreList(characters, data.characters),
                restoreList(locations, data.locations),
                restoreList(storyboards, data.storyboards),
                restoreList(shots, data.shots),
                restoreList(callSheets, data.callSheets),
                restoreList(moodboards, data.moodboards),
                restoreList(tasks, data.tasks),
                restoreList(documents, data.documents)
            ]);

            showToast('Project workspace successfully restored!', 'success');
            setTimeout(() => {
                window.location.hash = `#/project/${project.id}`;
            }, 500);
        } catch (err) {
            console.error('Backup restoration failed:', err);
            showToast('Failed to parse backup JSON file: ' + err.message, 'error');
        } finally {
            importInput.value = '';
        }
    });
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 100);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
