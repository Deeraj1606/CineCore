/**
 * characters.js — Characters Universe Database for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, characters } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog, Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
};

export async function renderCharacters(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Characters', href: `#/project/${project.id}/characters` }
    ]);

    const charList = await characters.getByProject(projectId);

    container.innerHTML = `
        <div class="characters-view">
            <!-- Header -->
            <div class="view-header">
                <div>
                    <h1 class="view-title">Character Universe</h1>
                    <p class="view-subtitle">Manage character bibles, psychological arcs, dialogue traits, and relationships for ${escapeHtml(project.name)}.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-character-btn" class="btn primary">
                        ${SVG.plus} Add Character
                    </button>
                </div>
            </div>

            <!-- Filters & Search Bar -->
            <div class="characters-filter-bar">
                <div class="role-filter-pills">
                    <button class="role-pill active" data-role="all">All (${charList.length})</button>
                    <button class="role-pill" data-role="Protagonist">Protagonist (${charList.filter(c => c.role === 'Protagonist').length})</button>
                    <button class="role-pill" data-role="Antagonist">Antagonist (${charList.filter(c => c.role === 'Antagonist').length})</button>
                    <button class="role-pill" data-role="Supporting">Supporting (${charList.filter(c => c.role === 'Supporting').length})</button>
                    <button class="role-pill" data-role="Minor">Minor (${charList.filter(c => c.role === 'Minor').length})</button>
                </div>
                <div class="character-search search-input-wrapper">
                    <span class="search-icon-affix">${SVG.search}</span>
                    <input type="text" id="character-search-input" class="search-input" placeholder="Search by cue name, full name, role, goals..." />
                </div>
            </div>

            <!-- Character Grid / Empty State -->
            <div id="characters-grid-container">
                ${charList.length === 0 ? renderNoCharactersState() : renderCharactersGrid(charList, project)}
            </div>
        </div>
    `;

    bindCharacterViewEvents(container, project, charList);
}

function renderNoCharactersState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon" style="color: var(--cine-violet);">${SVG.user}</div>
            <h2>No Characters Yet</h2>
            <p>Build your cast! Characters created here are automatically available for screenplay autocomplete, dialogue attribution, and production breakdown tagging.</p>
            <button id="create-first-char-btn" class="btn primary btn-lg">
                ${SVG.plus} Create First Character
            </button>
        </div>
    `;
}

function renderCharactersGrid(list, project) {
    if (list.length === 0) {
        return `<div class="empty-filter-state"><p>No characters match your search or filter criteria.</p></div>`;
    }

    return `
        <div class="characters-grid">
            ${list.map(char => `
                <div class="character-card" data-id="${char.id}" data-role="${char.role}">
                    <div class="character-card-header">
                        <div class="character-avatar">${(char.name || '?')[0].toUpperCase()}</div>
                        <div class="character-card-titles">
                            <h3 class="character-name">${escapeHtml(char.name)}</h3>
                            <span class="character-role role-${(char.role || 'supporting').toLowerCase()}">${escapeHtml(char.role || 'Supporting')}</span>
                        </div>
                        <div class="character-actions">
                            <button class="btn-icon-ghost delete-char-btn" data-id="${char.id}" title="Delete Character">
                                ${SVG.trash}
                            </button>
                        </div>
                    </div>

                    <div class="character-card-body">
                        ${char.fullName && char.fullName !== char.name ? `<div class="character-fullname"><strong>Full Name:</strong> ${escapeHtml(char.fullName)}</div>` : ''}
                        ${char.age ? `<div class="character-age"><strong>Age:</strong> ${escapeHtml(char.age)}</div>` : ''}
                        <p class="character-bio-snippet">${escapeHtml(char.bio || 'No background bio provided.')}</p>
                        
                        ${char.goals ? `
                            <div class="character-goal-badge">
                                <strong>Goal:</strong> ${escapeHtml(char.goals)}
                            </div>
                        ` : ''}
                    </div>

                    <div class="character-card-footer">
                        <a href="#/project/${project.id}/characters/${char.id}" class="btn small secondary full-width" style="display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                            View &amp; Edit Profile ${SVG.arrowRight}
                        </a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function bindCharacterViewEvents(container, project, charList) {
    const searchInput = container.querySelector('#character-search-input');
    const rolePills = container.querySelectorAll('.role-pill');
    const gridContainer = container.querySelector('#characters-grid-container');

    let currentRole = 'all';
    let searchQuery = '';

    function applyFilters() {
        let filtered = charList;
        if (currentRole !== 'all') {
            filtered = filtered.filter(c => (c.role || '').toLowerCase() === currentRole.toLowerCase());
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(q) ||
                (c.fullName && c.fullName.toLowerCase().includes(q)) ||
                (c.bio && c.bio.toLowerCase().includes(q)) ||
                (c.goals && c.goals.toLowerCase().includes(q))
            );
        }
        gridContainer.innerHTML = renderCharactersGrid(filtered, project);
        bindCardActions(gridContainer, project);
    }

    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyFilters();
    });

    rolePills.forEach(pill => {
        pill.addEventListener('click', () => {
            rolePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentRole = pill.getAttribute('data-role');
            applyFilters();
        });
    });

    // Add Character modal
    const openAddModal = () => {
        const modal = new Modal({
            title: 'Add New Character',
            size: 'medium',
            content: `
                <div class="form-group">
                    <label class="form-label">Character Screenplay Cue Name <span class="required">*</span></label>
                    <input type="text" id="modal-char-name" class="form-input uppercase-input" placeholder="e.g. SARAH CONNOR, DETECTIVE MILLER" required />
                    <span class="form-hint">Used in dialogue cues and script headings (will be auto-uppercased).</span>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Full Legal Name</label>
                        <input type="text" id="modal-char-fullname" class="form-input" placeholder="e.g. Sarah Jeanette Connor" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Role</label>
                        <select id="modal-char-role" class="form-select">
                            <option value="Protagonist">Protagonist</option>
                            <option value="Antagonist">Antagonist</option>
                            <option value="Supporting" selected>Supporting</option>
                            <option value="Minor">Minor</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Age</label>
                        <input type="text" id="modal-char-age" class="form-input" placeholder="e.g. 34, Late 20s" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Primary Dramatic Need / Goal</label>
                        <input type="text" id="modal-char-goal" class="form-input" placeholder="e.g. Uncover who murdered her partner" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Backstory &amp; Bio</label>
                    <textarea id="modal-char-bio" class="form-textarea" rows="3" placeholder="Brief backstory and psychological overview..."></textarea>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Character',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const nameInput = document.getElementById('modal-char-name');
                        const fullNameInput = document.getElementById('modal-char-fullname');
                        const roleSelect = document.getElementById('modal-char-role');
                        const ageInput = document.getElementById('modal-char-age');
                        const goalInput = document.getElementById('modal-char-goal');
                        const bioInput = document.getElementById('modal-char-bio');

                        const name = nameInput?.value.trim().toUpperCase();
                        if (!name) {
                            nameInput?.focus();
                            return;
                        }

                        const newChar = await characters.create({
                            projectId: project.id,
                            name,
                            fullName: fullNameInput?.value.trim() || '',
                            role: roleSelect?.value || 'Supporting',
                            age: ageInput?.value.trim() || '',
                            goals: goalInput?.value.trim() || '',
                            bio: bioInput?.value.trim() || ''
                        });

                        m.close();
                        showToast(`Character "${name}" created!`, 'success');
                        router.navigate(`/project/${project.id}/characters/${newChar.id}`);
                    }
                }
            ]
        });
        modal.open();
    };

    container.querySelector('#add-character-btn')?.addEventListener('click', openAddModal);
    container.querySelector('#create-first-char-btn')?.addEventListener('click', openAddModal);

    bindCardActions(gridContainer, project);
}

function bindCardActions(container, project) {
    container.querySelectorAll('.delete-char-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const charId = btn.getAttribute('data-id');
            const c = await characters.get(charId);
            if (!c) return;

            const confirmed = await confirmDialog({
                title: `Delete ${c.name}?`,
                message: `Are you sure you want to remove ${c.name} from this project? Dialogue cues and linked records will be unlinked.`,
                confirmText: 'Delete Character',
                isDanger: true
            });

            if (confirmed) {
                await characters.delete(charId);
                showToast(`Character ${c.name} deleted`, 'success');
                renderCharacters(document.getElementById('app-content'), { id: project.id });
            }
        });
    });

    container.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            const cid = card.getAttribute('data-id');
            router.navigate(`/project/${project.id}/characters/${cid}`);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
