/**
 * story.js — Story Development & Document Hub for CINECORE
 * Houses Premise, Treatment, Beat Sheets, Series Bibles, and Story Notes.
 * "ONE PROJECT. ONE CONNECTED WORKSPACE. ONE SOURCE OF TRUTH. EVERYTHING IN SYNC."
 */

import { projects, documents } from '../store.js';
import { appState } from '../state.js';
import { router } from '../router.js';
import { renderBreadcrumb } from '../components/breadcrumb.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const SVG = {
    doc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    treatment: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    bible: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    beatsheet: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    outline: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
    note: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    save: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
};

export async function renderStory(container, params) {
    const projectId = params.id;
    const project = await projects.get(projectId);

    if (!project) {
        router.navigate('/');
        return;
    }

    appState.set('currentProject', project);
    renderBreadcrumb([
        { label: project.name, href: `#/project/${project.id}` },
        { label: 'Story Development', href: `#/project/${project.id}/story` }
    ]);

    const docs = await documents.getByProject(projectId);

    container.innerHTML = `
        <div class="story-view">
            <div class="view-header">
                <div>
                    <h1 class="view-title">Story Development</h1>
                    <p class="view-subtitle">Treatments, three-act beat sheets, series bibles, and premise documents for ${escapeHtml(project.name)}.</p>
                </div>
                <div class="view-header-actions">
                    <button id="new-doc-btn" class="btn primary">
                        ${SVG.plus} New Document
                    </button>
                </div>
            </div>

            <div class="story-layout">
                <!-- Sidebar of docs -->
                <div class="story-docs-sidebar">
                    <div class="sidebar-sec-title">DOCUMENTS (${docs.length})</div>
                    <div class="doc-list" id="doc-list">
                        ${docs.length === 0 ? `<div class="empty-docs-hint">No story documents yet. Click "New Document" above.</div>` : docs.map((d, i) => `
                            <div class="doc-item ${i === 0 ? 'active' : ''}" data-id="${d.id}">
                                <span class="doc-type-icon">${docSvgIcon(d.type)}</span>
                                <div class="doc-item-meta">
                                    <span class="doc-item-title">${escapeHtml(d.title)}</span>
                                    <span class="doc-item-type">${d.type.toUpperCase()}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Document Editor Pane -->
                <div class="story-doc-pane" id="doc-pane">
                    ${docs.length === 0 ? renderNoDocPane() : renderDocEditor(docs[0])}
                </div>
            </div>
        </div>
    `;

    bindStoryEvents(container, project, docs);
}

function docSvgIcon(type) {
    switch (type) {
        case 'treatment': return SVG.treatment;
        case 'bible': return SVG.bible;
        case 'outline': return SVG.outline;
        case 'beatsheet': return SVG.beatsheet;
        default: return SVG.note;
    }
}

function renderNoDocPane() {
    return `
        <div class="empty-pane-card">
            <div class="empty-pane-icon" style="color: var(--cine-magenta);">${SVG.doc}</div>
            <h3>No Document Selected</h3>
            <p>Create a treatment, beat sheet, premise document, or series bible to establish your narrative foundation.</p>
        </div>
    `;
}

function renderDocEditor(doc) {
    return `
        <div class="active-doc-editor" data-id="${doc.id}">
            <div class="doc-editor-top">
                <input type="text" id="active-doc-title" class="doc-title-input" value="${escapeHtml(doc.title)}" placeholder="Document Title..." />
                <div class="doc-actions">
                    <select id="active-doc-type" class="form-select small-select">
                        <option value="treatment" ${doc.type === 'treatment' ? 'selected' : ''}>Treatment</option>
                        <option value="beatsheet" ${doc.type === 'beatsheet' ? 'selected' : ''}>Beat Sheet</option>
                        <option value="bible" ${doc.type === 'bible' ? 'selected' : ''}>Series Bible</option>
                        <option value="outline" ${doc.type === 'outline' ? 'selected' : ''}>Outline</option>
                        <option value="note" ${doc.type === 'note' ? 'selected' : ''}>General Notes</option>
                    </select>
                    <button id="save-doc-btn" class="btn small primary" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                        ${SVG.save} Save
                    </button>
                    <button id="delete-doc-btn" class="btn small secondary danger-text" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                        ${SVG.trash} Delete
                    </button>
                </div>
            </div>
            <textarea id="active-doc-content" class="doc-content-textarea" placeholder="Write your treatment, beat breakdown, premise, themes, character webs, or scene notes here... (Ctrl+S to save)">${escapeHtml(doc.content || '')}</textarea>
        </div>
    `;
}

function bindStoryEvents(container, project, docs) {
    function selectDoc(docId) {
        container.querySelectorAll('.doc-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-id') === docId);
        });
        const doc = docs.find(d => d.id === docId);
        const pane = container.querySelector('#doc-pane');
        if (doc && pane) {
            pane.innerHTML = renderDocEditor(doc);
            bindEditorEvents(pane, doc);
        }
    }

    function bindEditorEvents(pane, doc) {
        const titleInput = pane.querySelector('#active-doc-title');
        const typeSelect = pane.querySelector('#active-doc-type');
        const contentText = pane.querySelector('#active-doc-content');
        const saveBtn = pane.querySelector('#save-doc-btn');
        const deleteBtn = pane.querySelector('#delete-doc-btn');

        async function saveCurrentDoc() {
            const newTitle = titleInput.value.trim() || 'Untitled Document';
            const newType = typeSelect.value;
            const newContent = contentText.value;

            await documents.update(doc.id, {
                title: newTitle,
                type: newType,
                content: newContent
            });

            doc.title = newTitle;
            doc.type = newType;
            doc.content = newContent;

            // Update item in sidebar
            const sideItem = container.querySelector(`.doc-item[data-id="${doc.id}"]`);
            if (sideItem) {
                sideItem.querySelector('.doc-item-title').textContent = newTitle;
                sideItem.querySelector('.doc-item-type').textContent = newType.toUpperCase();
                sideItem.querySelector('.doc-type-icon').innerHTML = docSvgIcon(newType);
            }

            showToast('Document saved successfully', 'success');
        }

        saveBtn?.addEventListener('click', saveCurrentDoc);

        // Keyboard shortcut Ctrl+S / Cmd+S in editor
        contentText?.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveCurrentDoc();
            }
        });

        titleInput?.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveCurrentDoc();
            }
        });

        deleteBtn?.addEventListener('click', async () => {
            const confirmed = await confirmDialog({
                title: `Delete ${doc.title}?`,
                message: 'Are you sure you want to permanently delete this story document?',
                confirmText: 'Delete Document',
                isDanger: true
            });

            if (confirmed) {
                await documents.delete(doc.id);
                showToast('Document deleted', 'success');
                renderStory(container, { id: project.id });
            }
        });
    }

    if (docs.length > 0) {
        bindEditorEvents(container.querySelector('#doc-pane'), docs[0]);
    }

    container.querySelectorAll('.doc-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            selectDoc(id);
        });
    });

    // New Doc Button
    container.querySelector('#new-doc-btn')?.addEventListener('click', async () => {
        const newDoc = await documents.create({
            projectId: project.id,
            title: 'Untitled Story Document',
            type: 'treatment',
            content: ''
        });

        showToast('New document created', 'success');
        renderStory(container, { id: project.id });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
