/**
 * share-modal.js — Project Sharing & Collaboration Dialog for CINECORE
 * Allows project owners to invite friends, manage roles (Editor / Viewer),
 * and revoke access according to Firestore Security Rules.
 */

import { addProjectMember, removeProjectMember, getCloudProject } from "../firebase/firestore.js";
import { getCurrentUser } from "../firebase/auth.js";
import { showToast } from "./toast.js";

let activeModal = null;

export async function openShareModal(project) {
    closeShareModal();

    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('Please sign in to share projects with collaborators.', 'warning');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay share-modal-overlay';
    overlay.id = 'share-modal-overlay';

    overlay.innerHTML = `
        <div class="modal-card share-modal-card">
            <button class="modal-close-btn" id="share-close-btn" title="Close" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="share-modal-header">
                <span class="share-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="color:var(--cine-cyan);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </span>
                <div>
                    <h3 class="share-title">Share Project</h3>
                    <p class="share-subtitle">Collaborate on <strong>${escapeHtml(project.name)}</strong></p>
                </div>
            </div>

            <!-- Add Collaborator Form -->
            <form id="add-member-form" class="add-member-form">
                <div class="form-row" style="display:flex; gap:0.5rem; margin-bottom:1rem;">
                    <input type="email" id="collaborator-email" class="form-input" placeholder="colleague@filmmaker.com" required style="flex:2;" />
                    <select id="collaborator-role" class="form-select" style="flex:1;">
                        <option value="editor">Editor (Can edit)</option>
                        <option value="viewer">Viewer (Read-only)</option>
                    </select>
                    <button type="submit" class="btn btn-primary" id="btn-add-collaborator" style="white-space:nowrap; display:inline-flex; align-items:center;">
                        <span class="btn-text" style="display:inline-flex; align-items:center;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add
                        </span>
                        <span class="btn-spinner hidden" id="collab-spinner">
                            <svg class="auth-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
                        </span>
                    </button>
                </div>
            </form>

            <div class="share-members-section">
                <div class="share-section-title">PROJECT MEMBERS & ACCESS</div>
                <div class="members-list" id="project-members-list">
                    <div class="loading-placeholder">Loading members...</div>
                </div>
            </div>

            <div class="share-footer-note">
                <small>Editors can write and update script blocks. Viewers have read-only access. Only the Owner can delete projects or change memberships.</small>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    activeModal = overlay;

    overlay.querySelector('#share-close-btn').addEventListener('click', closeShareModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeShareModal();
    });

    const membersListEl = overlay.querySelector('#project-members-list');
    const form = overlay.querySelector('#add-member-form');
    const emailInput = overlay.querySelector('#collaborator-email');
    const roleSelect = overlay.querySelector('#collaborator-role');
    const submitBtn = overlay.querySelector('#btn-add-collaborator');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('#collab-spinner');

    async function loadMembers() {
        try {
            const cloudProj = await getCloudProject(project.id);
            const members = (cloudProj && cloudProj.members) ? cloudProj.members : {
                [currentUser.uid]: {
                    role: 'owner',
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'You'
                }
            };

            const isOwner = cloudProj ? cloudProj.ownerId === currentUser.uid : true;

            membersListEl.innerHTML = Object.entries(members).map(([uid, m]) => `
                <div class="member-item">
                    <div class="member-info">
                        <span class="member-avatar">${(m.displayName || m.email || 'U').charAt(0).toUpperCase()}</span>
                        <div class="member-details">
                            <span class="member-name">${escapeHtml(m.displayName || m.email.split('@')[0])} ${uid === currentUser.uid ? '<small class="tag-pill">(You)</small>' : ''}</span>
                            <span class="member-email">${escapeHtml(m.email)}</span>
                        </div>
                    </div>
                    <div class="member-role-group">
                        <span class="role-badge role-${m.role}">${m.role.toUpperCase()}</span>
                        ${isOwner && uid !== currentUser.uid ? `
                            <button class="btn-remove-member" data-uid="${uid}" title="Remove collaborator" aria-label="Remove collaborator">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            // Attach remove handlers
            membersListEl.querySelectorAll('.btn-remove-member').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const targetUid = btn.getAttribute('data-uid');
                    if (confirm('Remove this collaborator from the project?')) {
                        try {
                            btn.disabled = true;
                            await removeProjectMember(project.id, targetUid);
                            showToast('Collaborator removed.', 'info');
                            loadMembers();
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    }
                });
            });
        } catch (err) {
            membersListEl.innerHTML = `<div class="member-item"><span style="color:var(--app-text-muted);">Local project — sign in and save to cloud to invite collaborators.</span></div>`;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const role = roleSelect.value;

        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            await addProjectMember(project.id, email, role);
            showToast(`Added ${email} as ${role}!`, 'success');
            emailInput.value = '';
            loadMembers();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    loadMembers();
}

export function closeShareModal() {
    if (activeModal && activeModal.parentNode) {
        activeModal.parentNode.removeChild(activeModal);
    }
    activeModal = null;
}

function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
