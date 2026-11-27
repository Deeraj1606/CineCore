/**
 * project-new.js — Project Creation Wizard for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, seasons, episodes, screenplays } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { showToast } from '../components/toast.js';

const SVG = {
    back: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    film: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
    short: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    webSeries: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    tvSeries: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`,
    custom: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    arrowRight: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
};

export async function renderProjectNew(container) {
    appState.set('currentProject', null);
    renderBreadcrumb([{ label: 'New Project', href: '#/projects/new' }]);

    const projectTypes = [
        {
            id: 'film',
            title: 'Feature Film',
            icon: SVG.film,
            desc: 'A single unified screenplay with three-act structure, full character database, and scene breakdown.',
            defaultStructure: '1 Screenplay • Characters • Locations • Breakdown',
            color: 'var(--cine-cyan)'
        },
        {
            id: 'short',
            title: 'Short Film',
            icon: SVG.short,
            desc: 'A concise screenplay (1-30 pages), focused cast, and tight production breakdown.',
            defaultStructure: '1 Short Screenplay • Characters • Locations',
            color: 'var(--cine-lime)'
        },
        {
            id: 'web-series',
            title: 'Web Series',
            icon: SVG.webSeries,
            desc: 'Multi-episode episodic structure with Season and Episode management, cross-episode characters, and season bibles.',
            defaultStructure: 'Seasons • Episodes • Multi-screenplay • Shared Universe',
            color: 'var(--cine-violet)'
        },
        {
            id: 'tv-series',
            title: 'TV Series',
            icon: SVG.tvSeries,
            desc: 'Full broadcast or streaming series architecture with Pilot, Season Arcs, Episode Bibles, and Production Board.',
            defaultStructure: 'Series Bible • Seasons • Episodes • Arcs',
            color: 'var(--cine-yellow)'
        },
        {
            id: 'custom',
            title: 'Custom Project',
            icon: SVG.custom,
            desc: 'Blank canvas for anthologies, commercials, documentaries, or experimental cinema.',
            defaultStructure: 'Flexible structure • Modular tools',
            color: 'var(--cine-magenta)'
        }
    ];

    let selectedType = 'film';

    container.innerHTML = `
        <div class="project-wizard-view">
            <div class="wizard-header">
                <a href="#/" class="btn-back" style="display: inline-flex; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem;">
                    ${SVG.back} Back to Projects
                </a>
                <h1 class="wizard-title">Create New Project</h1>
                <p class="wizard-subtitle">Choose your project format and configure the initial workspace structure.</p>
            </div>

            <form id="project-form" class="wizard-form">
                <!-- Step 1: Format Selection -->
                <div class="form-section">
                    <label class="form-section-title">1. Choose Format</label>
                    <div class="type-cards-grid">
                        ${projectTypes.map(t => `
                            <div class="type-card ${t.id === selectedType ? 'selected' : ''}" data-type="${t.id}">
                                <div class="type-card-icon" style="color: ${t.color};">${t.icon}</div>
                                <div class="type-card-title">${t.title}</div>
                                <div class="type-card-desc">${t.desc}</div>
                                <div class="type-card-structure">
                                    <span class="structure-badge">${t.defaultStructure}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Step 2: Project Details -->
                <div class="form-section">
                    <label class="form-section-title">2. Project Details</label>
                    
                    <div class="form-group">
                        <label for="project-name" class="form-label">Project Title <span class="required">*</span></label>
                        <input type="text" id="project-name" class="form-input" placeholder="e.g. Neon Horizon, Dark Matter" required autofocus />
                    </div>

                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label for="project-genre" class="form-label">Genre</label>
                            <input type="text" id="project-genre" class="form-input" placeholder="e.g. Sci-Fi Thriller, Neo-Noir, Drama" list="genre-suggestions" />
                            <datalist id="genre-suggestions">
                                <option value="Sci-Fi">
                                <option value="Thriller">
                                <option value="Drama">
                                <option value="Action">
                                <option value="Horror">
                                <option value="Comedy">
                                <option value="Neo-Noir">
                                <option value="Mystery">
                                <option value="Cyberpunk">
                            </datalist>
                        </div>

                        <div class="form-group flex-1">
                            <label for="project-status" class="form-label">Initial Status</label>
                            <select id="project-status" class="form-select">
                                <option value="development" selected>Development / Writing</option>
                                <option value="treatment">Treatment / Concept</option>
                                <option value="pre-production">Pre-Production</option>
                                <option value="production">Production</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="project-logline" class="form-label">Logline / Core Premise</label>
                        <textarea id="project-logline" class="form-textarea" rows="3" placeholder="When a rogue detective discovers a simulated reality inside an orbital station, she must sacrifice her own memories to prevent an extinction-level reset."></textarea>
                        <span class="form-hint">A concise 1-2 sentence hook describing the protagonist, conflict, and stakes.</span>
                    </div>

                    <!-- Series Specific Options (Conditional) -->
                    <div id="series-options" class="series-options-box ${selectedType.includes('series') ? '' : 'hidden'}">
                        <h4 class="box-title">Series Initial Architecture</h4>
                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label for="initial-season-name" class="form-label">Season 1 Title</label>
                                <input type="text" id="initial-season-name" class="form-input" value="Season 1" />
                            </div>
                            <div class="form-group flex-1">
                                <label for="initial-episodes-count" class="form-label">Number of Episodes</label>
                                <input type="number" id="initial-episodes-count" class="form-input" value="6" min="1" max="50" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="wizard-footer">
                    <a href="#/" class="btn secondary">Cancel</a>
                    <button type="submit" id="create-submit-btn" class="btn primary btn-lg" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        Create Project &amp; Open Workspace ${SVG.arrowRight}
                    </button>
                </div>
            </form>
        </div>
    `;

    // Interaction handling
    const form = container.querySelector('#project-form');
    const typeCards = container.querySelectorAll('.type-card');
    const seriesOptions = container.querySelector('#series-options');

    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            typeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedType = card.getAttribute('data-type');

            if (selectedType === 'web-series' || selectedType === 'tv-series') {
                seriesOptions.classList.remove('hidden');
            } else {
                seriesOptions.classList.add('hidden');
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = container.querySelector('#project-name');
        const genreInput = container.querySelector('#project-genre');
        const statusSelect = container.querySelector('#project-status');
        const loglineInput = container.querySelector('#project-logline');

        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            return;
        }

        const submitBtn = container.querySelector('#create-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Setting up project workspace...';

        try {
            const colors = {
                'film': '#00e5ff',
                'short': '#45ed86',
                'web-series': '#713bff',
                'tv-series': '#ffd629',
                'custom': '#ff38b8'
            };

            // 1. Create project record
            const newProject = await projects.create({
                name,
                type: selectedType,
                genre: genreInput.value.trim(),
                status: statusSelect.value,
                logline: loglineInput.value.trim(),
                coverColor: colors[selectedType] || '#713bff'
            });

            // 2. Setup initial structure based on type
            if (selectedType === 'web-series' || selectedType === 'tv-series') {
                const s1Name = container.querySelector('#initial-season-name').value.trim() || 'Season 1';
                const epCount = parseInt(container.querySelector('#initial-episodes-count').value, 10) || 6;

                // Create Season 1
                const s1 = await seasons.create({
                    projectId: newProject.id,
                    name: s1Name,
                    order: 1,
                    description: `First season of ${name}`
                });

                // Create initial episodes
                for (let i = 1; i <= Math.min(epCount, 24); i++) {
                    const ep = await episodes.create({
                        projectId: newProject.id,
                        seasonId: s1.id,
                        order: i,
                        title: i === 1 ? 'Pilot' : `Episode ${i}`,
                        status: i === 1 ? 'in_progress' : 'draft',
                        logline: i === 1 ? 'Series premiere and character introductions.' : ''
                    });

                    // Create screenplay for Episode 1
                    if (i === 1) {
                        await screenplays.create({
                            projectId: newProject.id,
                            episodeId: ep.id,
                            title: `${name} — ${ep.title}`,
                            content: `Title: ${name.toUpperCase()} - PILOT\nAuthor: Cinecore\n\nEXT. CITY SKYLINE - NIGHT\n\nRain streaks down high-rise obsidian towers. Neon advertisements reflect across the wet asphalt.\n`
                        });
                    }
                }
            } else {
                // Film or Short: Create default screenplay
                await screenplays.create({
                    projectId: newProject.id,
                    title: name,
                    content: `Title: ${name.toUpperCase()}\nAuthor: Screenwriter\n\nEXT. SCENE START - DAY\n\nThe story begins here.\n`
                });
            }

            showToast(`Project "${newProject.name}" created successfully!`, 'success');

            // Navigate to project overview
            router.navigate(`/project/${newProject.id}`);
        } catch (err) {
            console.error('Failed to create project:', err);
            showToast('Error creating project: ' + err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Project & Open Workspace →';
        }
    });
}
