/**
 * tasks.js — Department Tasks & Milestones for CINECORE
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, scenes, tasks } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { Modal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    tasks: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="18" y2="12"></line></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    clapper: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`
};

export async function renderTasks(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Production Tasks', href: `#/project/${project.id}/tasks` }
    ]);

    const taskList = await tasks.getByProject(projectId);
    const allScenes = await scenes.getByProject(projectId);
    const sceneMap = new Map(allScenes.map(s => [s.id, s]));

    container.innerHTML = `
        <div class="tasks-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Department Tasks &amp; Milestones</h1>
                    <p class="view-subtitle">Track pre-production, on-set, and post-production tasks linked directly to scenes and departments.</p>
                </div>
                <div class="view-header-actions">
                    <button id="add-task-btn" class="btn primary">
                        ${SVG.plus} Add Task
                    </button>
                </div>
            </div>

            <!-- Task Status Columns / Grid -->
            <div class="tasks-grid">
                <div class="task-column">
                    <div class="task-col-header">
                        <span>TO DO</span>
                        <span class="badge">${taskList.filter(t => t.status === 'todo').length}</span>
                    </div>
                    <div class="task-col-body">
                        ${renderTaskCards(taskList.filter(t => t.status === 'todo'), project, sceneMap)}
                    </div>
                </div>

                <div class="task-column">
                    <div class="task-col-header" style="border-top-color: var(--cine-yellow);">
                        <span>IN PROGRESS</span>
                        <span class="badge">${taskList.filter(t => t.status === 'in_progress').length}</span>
                    </div>
                    <div class="task-col-body">
                        ${renderTaskCards(taskList.filter(t => t.status === 'in_progress'), project, sceneMap)}
                    </div>
                </div>

                <div class="task-column">
                    <div class="task-col-header" style="border-top-color: var(--cine-magenta);">
                        <span>REVIEW</span>
                        <span class="badge">${taskList.filter(t => t.status === 'review').length}</span>
                    </div>
                    <div class="task-col-body">
                        ${renderTaskCards(taskList.filter(t => t.status === 'review'), project, sceneMap)}
                    </div>
                </div>

                <div class="task-column">
                    <div class="task-col-header" style="border-top-color: var(--cine-lime);">
                        <span>DONE</span>
                        <span class="badge">${taskList.filter(t => t.status === 'done').length}</span>
                    </div>
                    <div class="task-col-body">
                        ${renderTaskCards(taskList.filter(t => t.status === 'done'), project, sceneMap)}
                    </div>
                </div>
            </div>
        </div>
    `;

    bindTaskEvents(container, project, allScenes);
}

function renderTaskCards(list, project, sceneMap) {
    if (list.length === 0) {
        return `<div class="empty-column-hint">No tasks in this lane</div>`;
    }

    return list.map(t => {
        const scn = t.relatedEntityId ? sceneMap.get(t.relatedEntityId) : null;

        return `
            <div class="task-card priority-${t.priority || 'medium'}" data-id="${t.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <span class="badge" style="background: rgba(255, 255, 255, 0.08); font-size: 0.7rem;">${escapeHtml(t.department || 'Production')}</span>
                    <button class="btn-icon-ghost delete-task-btn" data-id="${t.id}" title="Delete Task">
                        ${SVG.trash}
                    </button>
                </div>

                <h4 style="margin: 0.5rem 0 0.25rem 0; font-size: 0.92rem; line-height: 1.35; color: var(--app-text);">${escapeHtml(t.title)}</h4>

                ${scn ? `
                    <div style="margin: 0.4rem 0;">
                        <a href="#/project/${project.id}/scenes" class="entity-chip entity-chip-scene" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                            ${SVG.clapper} Scene #${scn.sceneNumber}
                        </a>
                    </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--app-text-muted); margin-top: 0.65rem;">
                    <span style="display: inline-flex; align-items: center; gap: 0.3rem;">
                        ${SVG.user} ${escapeHtml(t.assignedTo || 'Unassigned')}
                    </span>
                    <select class="form-select small-select task-move-select" data-id="${t.id}">
                        <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
                        <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="review" ${t.status === 'review' ? 'selected' : ''}>Review</option>
                        <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function bindTaskEvents(container, project, allScenes) {
    const openAddModal = () => {
        const modal = new Modal({
            title: 'Add Production Task',
            size: 'medium',
            content: `
                <div class="form-group">
                    <label class="form-label">Task Title <span class="required">*</span></label>
                    <input type="text" id="modal-task-title" class="form-input" placeholder="e.g. Settle location permit with City Film Office" required />
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Department</label>
                        <select id="modal-task-dept" class="form-select">
                            <option value="Production" selected>Production</option>
                            <option value="Camera">Camera</option>
                            <option value="Art Department">Art Department / Props</option>
                            <option value="Wardrobe">Wardrobe / Makeup</option>
                            <option value="Lighting / G&E">Lighting / G&E</option>
                            <option value="Sound">Sound</option>
                            <option value="Post-Production">Post-Production</option>
                        </select>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Priority</label>
                        <select id="modal-task-priority" class="form-select">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">Assigned To</label>
                        <input type="text" id="modal-task-assignee" class="form-input" placeholder="e.g. 1st AD, Prop Master, Key Grip" />
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Linked Scene (Optional)</label>
                        <select id="modal-task-scene" class="form-select">
                            <option value="">None (General Project)</option>
                            ${allScenes.map(s => `<option value="${s.id}">Scene #${s.sceneNumber}: ${escapeHtml(s.heading)}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Cancel', class: 'secondary', onClick: (_, m) => m.close() },
                {
                    label: 'Create Task',
                    class: 'primary',
                    onClick: async (_, m) => {
                        const title = document.getElementById('modal-task-title')?.value.trim();
                        if (!title) {
                            document.getElementById('modal-task-title')?.focus();
                            return;
                        }
                        const dept = document.getElementById('modal-task-dept')?.value || 'Production';
                        const priority = document.getElementById('modal-task-priority')?.value || 'medium';
                        const assignedTo = document.getElementById('modal-task-assignee')?.value.trim() || '';
                        const sceneId = document.getElementById('modal-task-scene')?.value || null;

                        await tasks.create({
                            projectId: project.id,
                            title,
                            department: dept,
                            priority,
                            assignedTo,
                            status: 'todo',
                            relatedEntityType: sceneId ? 'scene' : null,
                            relatedEntityId: sceneId
                        });

                        m.close();
                        showToast(`Task "${title}" created!`, 'success');
                        renderTasks(container, { id: project.id });
                    }
                }
            ]
        });
        modal.open();
    };

    container.querySelector('#add-task-btn')?.addEventListener('click', openAddModal);

    // Status change
    container.querySelectorAll('.task-move-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const taskId = sel.getAttribute('data-id');
            await tasks.update(taskId, { status: sel.value });
            showToast('Task updated', 'info');
            renderTasks(container, { id: project.id });
        });
    });

    // Delete task
    container.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tid = btn.getAttribute('data-id');
            const confirmed = await confirmDialog({
                title: 'Delete Task?',
                message: 'Are you sure you want to remove this task?',
                confirmText: 'Delete Task',
                isDanger: true
            });
            if (confirmed) {
                await tasks.delete(tid);
                showToast('Task deleted', 'success');
                renderTasks(container, { id: project.id });
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
