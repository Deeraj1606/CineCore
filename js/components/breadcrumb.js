/**
 * breadcrumb.js — Breadcrumb Navigation for CINECORE
 * Always shows the user "where am I?" in the hierarchy.
 */

import { appState } from '../state.js';

/**
 * Update the breadcrumb based on current state.
 * @param {Array} crumbs - Array of { label, href } objects
 */
export function renderBreadcrumb(crumbs = []) {
    const el = document.getElementById('app-breadcrumb');
    if (!el) return;

    // Always start with CINECORE
    const fullCrumbs = [{ label: 'CINECORE', href: '#/' }, ...crumbs];

    el.innerHTML = fullCrumbs.map((crumb, i) => {
        const isLast = i === fullCrumbs.length - 1;
        if (isLast) {
            return `<span class="breadcrumb-current">${escapeHtml(crumb.label)}</span>`;
        }
        return `<a href="${crumb.href}" class="breadcrumb-link">${escapeHtml(crumb.label)}</a><span class="breadcrumb-sep">›</span>`;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
