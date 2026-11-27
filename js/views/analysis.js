/**
 * analysis.js — Analysis Workspace View for CINECORE
 * "SCRIPT -> PARSE -> EXTRACT CANDIDATES -> REVIEW -> SAVE ENTITIES -> LINK RECORDS -> UPDATE DEPENDENCIES"
 * 
 * Interactive candidate review interface with duplicate resolution, merge modal,
 * filterable queues, and bulk confirmation to canonical project stores.
 */

import { projects, screenplays, analysisCandidates } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { runScriptAnalysisPipeline, commitVerifiedCandidates } from '../analysis.js';

const SVG = {
    analysis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    zap: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    doc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    pin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    clapper: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    box: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
};

export async function renderAnalysis(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Script Intelligence & Analysis', href: `#/project/${project.id}/analysis` }
    ]);

    const script = await screenplays.getForProject(projectId);
    const candidates = script ? await analysisCandidates.getByScreenplay(script.id) : [];

    // Filter counts
    const charCount = candidates.filter(c => c.entityType === 'character').length;
    const locCount = candidates.filter(c => c.entityType === 'location').length;
    const sceneCount = candidates.filter(c => c.entityType === 'scene').length;
    const eventCount = candidates.filter(c => c.entityType === 'event').length;
    const prodCount = candidates.filter(c => ['props', 'costumes', 'vehicles', 'vfxstunts', 'soundfx'].includes(c.entityType)).length;

    container.innerHTML = `
        <div class="analysis-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Screenplay Analysis &amp; Extraction Workspace</h1>
                    <p class="view-subtitle">Review candidate entities, detect duplicates, confirm narrative beats, and commit verified records to your Production OS.</p>
                </div>
                <div class="view-header-actions">
                    <button id="run-analysis-btn" class="btn primary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.zap} Run Full Analysis
                    </button>
                    <button id="commit-verified-btn" class="btn secondary" ${candidates.length === 0 ? 'disabled' : ''} style="display: inline-flex; align-items: center; gap: 0.4rem;">
                        ${SVG.check} Commit Verified Entities
                    </button>
                </div>
            </div>

            <!-- Analysis Metrics Hub -->
            <div class="metrics-grid">
                <div class="metric-card filter-metric active" data-filter="all">
                    <div class="metric-icon" style="color: var(--cine-violet);">${SVG.doc}</div>
                    <div class="metric-info">
                        <span class="metric-value">${candidates.length}</span>
                        <span class="metric-label">Total Candidates</span>
                    </div>
                </div>
                <div class="metric-card filter-metric" data-filter="character">
                    <div class="metric-icon" style="color: var(--cine-magenta);">${SVG.user}</div>
                    <div class="metric-info">
                        <span class="metric-value">${charCount}</span>
                        <span class="metric-label">Characters</span>
                    </div>
                </div>
                <div class="metric-card filter-metric" data-filter="location">
                    <div class="metric-icon" style="color: var(--cine-cyan);">${SVG.pin}</div>
                    <div class="metric-info">
                        <span class="metric-value">${locCount}</span>
                        <span class="metric-label">Locations</span>
                    </div>
                </div>
                <div class="metric-card filter-metric" data-filter="scene">
                    <div class="metric-icon" style="color: var(--cine-yellow);">${SVG.clapper}</div>
                    <div class="metric-info">
                        <span class="metric-value">${sceneCount}</span>
                        <span class="metric-label">Scenes</span>
                    </div>
                </div>
                <div class="metric-card filter-metric" data-filter="event">
                    <div class="metric-icon" style="color: var(--cine-coral);">${SVG.zap}</div>
                    <div class="metric-info">
                        <span class="metric-value">${eventCount}</span>
                        <span class="metric-label">Story Beats</span>
                    </div>
                </div>
                <div class="metric-card filter-metric" data-filter="production">
                    <div class="metric-icon" style="color: var(--cine-lime);">${SVG.box}</div>
                    <div class="metric-info">
                        <span class="metric-value">${prodCount}</span>
                        <span class="metric-label">Props &amp; Elements</span>
                    </div>
                </div>
            </div>

            <!-- Review Queue Controls -->
            <div class="filter-controls-bar">
                <div class="search-box search-input-wrapper">
                    <span class="search-icon-affix">${SVG.search}</span>
                    <input type="text" id="candidate-search-input" class="search-input" placeholder="Search candidate entities..." />
                </div>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-status="all">All States</button>
                    <button class="filter-btn" data-status="pending">Pending Review</button>
                    <button class="filter-btn" data-status="accepted">Accepted</button>
                    <button class="filter-btn" data-status="rejected">Ignored</button>
                </div>
            </div>

            <!-- Candidates Cards Grid -->
            <div class="candidate-cards-container" id="candidates-container">
                ${candidates.length === 0 ? renderEmptyState() : renderCandidatesList(candidates)}
            </div>
        </div>
    `;

    bindAnalysisEvents(container, project, script, candidates);
}

function renderEmptyState() {
    return `
        <div class="empty-state-card" style="text-align: center; padding: 4rem 2rem;">
            <div class="empty-state-icon" style="color: var(--cine-yellow); margin-bottom: 1rem;">${SVG.zap}</div>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">No Analysis Candidates Generated Yet</h2>
            <p style="color: var(--app-text-muted); max-width: 500px; margin: 0 auto 1.5rem;">
                Run the deterministic script intelligence parser to extract scenes, characters, locations, narrative story beats, and production elements.
            </p>
            <button id="empty-run-btn" class="btn primary btn-lg" style="display: inline-flex; align-items: center; gap: 0.4rem;">
                ${SVG.zap} Run Full Script Analysis
            </button>
        </div>
    `;
}

function renderCandidatesList(items) {
    return `
        <div class="candidate-grid">
            ${items.map(item => `
                <div class="candidate-card status-${item.status}" data-id="${item.id}" data-type="${item.entityType}" data-status="${item.status}">
                    <div class="candidate-card-header">
                        <span class="candidate-badge badge-${item.entityType}">${item.entityType.toUpperCase()}</span>
                        <span class="candidate-confidence" title="Extraction Confidence">${Math.round((item.confidence || 0.85) * 100)}% match</span>
                    </div>

                    <div class="candidate-card-body">
                        <h4 class="candidate-name">${escapeHtml(item.name)}</h4>
                        <p class="candidate-snippet">${escapeHtml(item.contextSnippet || item.sceneHeading || 'No contextual preview')}</p>
                        
                        ${item.metadata?.possibleDuplicateOf ? `
                            <div class="duplicate-warning-banner" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <span style="display: flex; align-items: center; gap: 0.35rem;">
                                    ${SVG.alert} Possible duplicate of: <strong>${escapeHtml(item.metadata.possibleDuplicateOf)}</strong>
                                </span>
                                <button class="btn small secondary merge-btn" data-id="${item.id}" data-target="${escapeHtml(item.metadata.possibleDuplicateOf)}">Merge</button>
                            </div>
                        ` : ''}

                        ${item.metadata?.dialogueLines ? `
                            <div class="candidate-detail-pill">${item.metadata.dialogueLines} dialogue lines • ${item.metadata.wordCount || 0} words</div>
                        ` : ''}
                    </div>

                        <button class="btn small ${item.status === 'accepted' ? 'primary' : 'secondary'} accept-cand-btn" data-id="${item.id}" style="display:inline-flex; align-items:center;">
                            ${item.status === 'accepted' ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Accepted` : 'Accept'}
                        </button>
                        <button class="btn small secondary reject-cand-btn" data-id="${item.id}">
                            ${item.status === 'rejected' ? 'Ignored' : 'Ignore'}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function bindAnalysisEvents(container, project, script, candidates) {
    const runBtn = container.querySelector('#run-analysis-btn');
    const emptyRunBtn = container.querySelector('#empty-run-btn');
    const commitBtn = container.querySelector('#commit-verified-btn');

    async function handleRun() {
        if (!script || !script.content) {
            showToast('No screenplay text found to analyze.', 'warning');
            return;
        }
        showToast('Running script intelligence analysis...', 'info');
        const extracted = await runScriptAnalysisPipeline(project.id, script.id, script.content);
        showToast(`Extraction complete! Found ${extracted.length} candidate entities.`, 'success');
        renderAnalysis(container, { id: project.id });
    }

    runBtn?.addEventListener('click', handleRun);
    emptyRunBtn?.addEventListener('click', handleRun);

    commitBtn?.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
            title: 'Commit Verified Entities',
            message: 'This will convert accepted candidates into canonical project Scenes, Characters, Locations, Breakdown items, and Story Beats with dynamic backlinks.',
            confirmText: 'Commit Now'
        });

        if (confirmed) {
            const stats = await commitVerifiedCandidates(project.id, script.id);
            showToast(`Committed: ${stats.scenes} scenes, ${stats.characters} characters, ${stats.locations} locations!`, 'success');
            renderAnalysis(container, { id: project.id });
        }
    });

    // Accept & Reject candidate buttons
    container.querySelectorAll('.accept-cand-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await analysisCandidates.update(id, { status: 'accepted' });
            btn.classList.add('primary');
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Accepted';
            showToast('Candidate accepted', 'success');
        });
    });

    container.querySelectorAll('.reject-cand-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await analysisCandidates.update(id, { status: 'rejected' });
            btn.textContent = 'Ignored';
            showToast('Candidate ignored', 'info');
        });
    });

    // Merge Duplicate Candidates
    container.querySelectorAll('.merge-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const target = btn.getAttribute('data-target');
            const confirmed = await confirmDialog({
                title: 'Merge Duplicate Candidate',
                message: `Merge this candidate into "${target}"?`,
                confirmText: 'Merge'
            });

            if (confirmed) {
                await analysisCandidates.update(id, { status: 'merged', mergedInto: target });
                showToast(`Merged into ${target}`, 'success');
                renderAnalysis(container, { id: project.id });
            }
        });
    });

    // Search and Status Filtering
    const searchInput = container.querySelector('#candidate-search-input');
    const filterBtns = container.querySelectorAll('.filter-btn');
    const metricCards = container.querySelectorAll('.filter-metric');

    let currentTypeFilter = 'all';
    let currentStatusFilter = 'all';

    function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const cards = container.querySelectorAll('.candidate-card');

        cards.forEach(card => {
            const type = card.getAttribute('data-type');
            const status = card.getAttribute('data-status');
            const text = card.textContent.toLowerCase();

            const matchesQuery = !query || text.includes(query);
            const matchesType = currentTypeFilter === 'all' || 
                (currentTypeFilter === 'production' ? ['props', 'costumes', 'vehicles', 'vfxstunts', 'soundfx'].includes(type) : type === currentTypeFilter);
            const matchesStatus = currentStatusFilter === 'all' || status === currentStatusFilter;

            if (matchesQuery && matchesType && matchesStatus) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput?.addEventListener('input', applyFilters);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatusFilter = btn.getAttribute('data-status');
            applyFilters();
        });
    });

    metricCards.forEach(card => {
        card.addEventListener('click', () => {
            metricCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentTypeFilter = card.getAttribute('data-filter');
            applyFilters();
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
