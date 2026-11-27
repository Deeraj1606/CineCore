import { projects, seasons, episodes, screenplays, characters, locations, documents, scenes, storyboards, shots, callSheets, moodboards, tasks, analysisCandidates } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { showToast } from '../components/toast.js';
import { openShareModal } from '../components/share-modal.js';

const SVG = {
    writer: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    analysis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    scenes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    storyboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>`,
    shots: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`,
    callsheet: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    breakdown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    tasks: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    moodboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    characters: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    locations: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    schedule: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    story: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    seasons: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    share: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    settings: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    open: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
};

export async function renderProjectOverview(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        container.innerHTML = `
            <div class="route-error-screen">
                <div class="route-error-card">
                    <div class="route-error-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--cine-coral);"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    </div>
                    <h2 class="route-error-title">Project Not Found</h2>
                    <p class="route-error-msg">The requested project does not exist or has been removed from your workspace.</p>
                    <div class="route-error-actions">
                        <a href="#/" class="btn primary">Return to Projects</a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Set active project state — triggers sidebar to re-render with project nav
    appState.set('currentProject', project);
    renderBreadcrumb([{ label: project.name, href: `#/project/${project.id}` }]);

    const isSeries = (project.type || '').includes('series');

    // Fetch all connected data in parallel
    const [
        projectSeasons,
        projectEpisodes,
        projectScreenplays,
        projectScenes,
        projectCharacters,
        projectLocations,
        projectStoryboards,
        projectShots,
        projectCallSheets,
        projectMoodboards,
        projectTasks,
        projectDocs,
        projectCandidates
    ] = await Promise.all([
        isSeries ? seasons.getByProject(projectId) : Promise.resolve([]),
        isSeries ? episodes.getByProject(projectId) : Promise.resolve([]),
        screenplays.getByProject(projectId),
        scenes.getByProject(projectId),
        characters.getByProject(projectId),
        locations.getByProject(projectId),
        storyboards.getByProject(projectId),
        shots.getByProject(projectId),
        callSheets.getByProject(projectId),
        moodboards.getByProject(projectId),
        tasks.getByProject(projectId),
        documents.getByProject(projectId),
        analysisCandidates.getByProject(projectId)
    ]);

    const openTasks = projectTasks.filter(t => t.status !== 'done').length;
    const coverColor = project.coverColor || '#713BFF';
    const statusClass = (project.status || 'development').replace(/[^a-z0-9]/g, '-');

    container.innerHTML = `
        <div class="project-overview-view" role="main">

            <!-- Project Banner -->
            <div class="project-banner" style="border-left: 4px solid ${coverColor};">
                <div class="project-banner-main">
                    <div class="project-banner-tags">
                        <span class="project-type-pill">${(project.type || 'film').replace(/-/g, ' ')}</span>
                        ${project.genre ? `<span class="project-genre-pill">${escapeHtml(project.genre)}</span>` : ''}
                        <span class="project-status-pill status-${statusClass}">${(project.status || 'development').replace(/-/g, ' ')}</span>
                    </div>
                    <h1 class="project-title">${escapeHtml(project.name)}</h1>
                    <p class="project-logline">${escapeHtml(project.logline || 'No logline defined. Add one in Settings.')}</p>
                </div>

                <div class="project-banner-actions">
                    ${isSeries ? `
                        <a href="#/project/${project.id}/seasons" class="btn primary btn-lg" id="overview-primary-cta">
                            ${SVG.seasons} Seasons &amp; Episodes
                        </a>
                    ` : `
                        <a href="#/project/${project.id}/writer" class="btn primary btn-lg" id="overview-primary-cta">
                            ${SVG.writer} Open Screenplay
                        </a>
                    `}
                    <button id="project-share-btn" class="btn secondary" title="Share with collaborators">
                        ${SVG.share} Share
                    </button>
                    <a href="#/project/${project.id}/settings" class="btn secondary" title="Project Settings">
                        ${SVG.settings}
                    </a>
                </div>
            </div>

            <!-- Dynamic Metrics Grid -->
            <div class="metrics-grid" role="region" aria-label="Project metrics">
                ${metricCard(project.id, 'scenes', SVG.scenes, projectScenes.length, 'Scenes', 'var(--cine-yellow)')}
                ${metricCard(project.id, 'characters', SVG.characters, projectCharacters.length, 'Characters', 'var(--cine-violet)')}
                ${metricCard(project.id, 'locations', SVG.locations, projectLocations.length, 'Locations', 'var(--cine-cyan)')}
                ${metricCard(project.id, 'storyboard', SVG.storyboard, projectStoryboards.length, 'Storyboards', 'var(--cine-magenta)')}
                ${metricCard(project.id, 'shots', SVG.shots, projectShots.length, 'Shots', 'var(--cine-tangerine)')}
                ${metricCard(project.id, 'tasks', SVG.tasks, openTasks, 'Open Tasks', 'var(--cine-coral)')}
                ${isSeries ? metricCard(project.id, 'seasons', SVG.seasons, projectEpisodes.length, 'Episodes', 'var(--cine-lime)') : ''}
            </div>

            <!-- Production OS Modules -->
            <div class="modules-section">
                <h2 class="section-title">Production OS</h2>
                <div class="modules-grid">
                    ${isSeries ? moduleCard(project.id, 'seasons', SVG.seasons, 'Seasons &amp; Episodes', 'Manage season bibles, episode orders, drafts, and episodic screenplays.', 'var(--cine-violet)') : moduleCard(project.id, 'writer', SVG.writer, 'Screenplay Writer', 'Professional multi-format editor with industry margins, pagination, and inline tags.', 'var(--cine-cyan)')}
                    ${moduleCard(project.id, 'analysis', SVG.analysis, 'Script Intelligence', 'Automated candidate extraction for scenes, characters, locations, and props.', 'var(--cine-yellow)')}
                    ${moduleCard(project.id, 'scenes', SVG.scenes, 'Scenes Hub', 'Central linked registry of scene entities, locations, characters, and shoot statuses.', 'var(--cine-yellow)')}
                    ${moduleCard(project.id, 'storyboard', SVG.storyboard, 'Visual Storyboards', 'Scene-linked boards with camera angles, aspect ratios, movement, and shot creation.', 'var(--cine-magenta)')}
                    ${moduleCard(project.id, 'shots', SVG.shots, 'Shot List Studio', 'Comprehensive shot suite with lens, framing, storyboard references, and status.', 'var(--cine-cyan)')}
                    ${moduleCard(project.id, 'callsheet', SVG.callsheet, 'Call Sheet Dispatch', 'Auto-generated from schedule. Draft revision vs. published immutable distribution.', 'var(--cine-lime)')}
                    ${moduleCard(project.id, 'breakdown', SVG.breakdown, 'Production Breakdown', 'Tag cast, props, wardrobe, VFX, stunts, and sound elements linked to scenes.', 'var(--cine-coral)')}
                    ${moduleCard(project.id, 'tasks', SVG.tasks, 'Production Tasks', 'Departmental Kanban task board linked to scenes, deadlines, and crew assignments.', 'var(--cine-yellow)')}
                    ${moduleCard(project.id, 'moodboard', SVG.moodboard, 'Moodboard &amp; Aesthetics', 'Visual references, color palettes, costumes, and lighting inspiration.', 'var(--cine-tangerine)')}
                    ${moduleCard(project.id, 'characters', SVG.characters, 'Characters Universe', 'Profiles, cast assignments, linked scenes, costume notes, and dialogue tracks.', 'var(--cine-violet)')}
                    ${moduleCard(project.id, 'locations', SVG.locations, 'Locations Database', 'Master location library with INT/EXT designations, scouting references, and scenes.', 'var(--cine-cyan)')}
                    ${moduleCard(project.id, 'schedule', SVG.schedule, 'Production Stripboard', 'Stripboard planning, shooting schedule, day/night grouping, and shoot days.', 'var(--cine-blue)')}
                    ${moduleCard(project.id, 'story', SVG.story, 'Story Development', 'Treatments, beat sheets, premise documents, character webs, and season bibles.', 'var(--cine-magenta)')}
                </div>
            </div>

            <!-- Series Quick Episode Preview -->
            ${isSeries && projectEpisodes.length > 0 ? `
                <div class="recent-episodes-section">
                    <div class="section-header-row">
                        <h2 class="section-title">Episodes Overview</h2>
                        <a href="#/project/${project.id}/seasons" class="link-action">Manage All →</a>
                    </div>
                    <div class="episodes-quick-list">
                        ${projectEpisodes.slice(0, 6).map(ep => `
                            <div class="episode-quick-item">
                                <div class="episode-quick-number">EP ${ep.order}</div>
                                <div class="episode-quick-info">
                                    <h4 class="episode-quick-title">${escapeHtml(ep.title)}</h4>
                                    <p class="episode-quick-logline">${escapeHtml(ep.logline || 'Drafting in progress…')}</p>
                                </div>
                                <span class="badge status-${(ep.status || 'draft').replace(/[^a-z]/g, '-')}">${(ep.status || 'draft').toUpperCase()}</span>
                                <a href="#/project/${project.id}/season/${ep.seasonId}/episode/${ep.id}/writer" class="btn small primary">Write</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.querySelector('#project-share-btn')?.addEventListener('click', () => {
        openShareModal(project);
    });
}

function metricCard(pid, route, icon, count, label, color) {
    return `
        <a href="#/project/${pid}/${route}" class="metric-card" role="link" aria-label="${count} ${label}">
            <div class="metric-icon" style="color: ${color};" aria-hidden="true">${icon}</div>
            <div class="metric-info">
                <span class="metric-value">${count}</span>
                <span class="metric-label">${label}</span>
            </div>
        </a>
    `;
}

function moduleCard(pid, route, icon, title, desc, color) {
    return `
        <a href="#/project/${pid}/${route}" class="module-card" aria-label="${title}">
            <div class="module-card-icon" style="color: ${color};" aria-hidden="true">${icon}</div>
            <div class="module-card-content">
                <h3 class="module-card-title">${title}</h3>
                <p class="module-card-desc">${desc}</p>
            </div>
            <span class="module-card-arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </span>
        </a>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
