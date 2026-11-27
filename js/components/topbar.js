/**
 * topbar.js — Global Top Bar for CINECORE
 * CINECORE branding, breadcrumbs, search trigger, Firebase user profile, and theme controls.
 */

import { appState } from '../state.js';
import { openAuthModal } from './auth-modal.js';
import { logoutUser } from '../firebase/auth.js';
import { showToast } from './toast.js';

const CINECORE_LOGO_SVG = `
<svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="#713BFF"/>
  <rect x="5" y="8" width="9" height="9" rx="2" fill="#FF38B8"/>
  <rect x="18" y="8" width="9" height="9" rx="2" fill="#00E5FF"/>
  <rect x="5" y="19" width="9" height="9" rx="2" fill="#FFD629"/>
  <rect x="18" y="19" width="9" height="9" rx="2" fill="#B9FF39"/>
</svg>`;

export function renderTopbar() {
    const el = document.getElementById('app-topbar');
    if (!el) return;

    const currentUser = appState.get('currentUser');

    el.innerHTML = `
        <div class="topbar-left">
            <button id="sidebar-toggle" class="topbar-icon-btn" title="Toggle Sidebar" aria-label="Toggle sidebar navigation">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
            <a href="#/" class="topbar-brand" title="CINECORE Home" aria-label="Go to CINECORE home">
                ${CINECORE_LOGO_SVG}
                <span class="topbar-brand-text">CINECORE</span>
            </a>
            <div class="topbar-breadcrumb-divider" aria-hidden="true"></div>
            <div id="app-breadcrumb" class="breadcrumb-container" role="navigation" aria-label="Breadcrumb"></div>
        </div>
        <div class="topbar-right">
            <!-- Cloud Connectivity Badge -->
            <div class="topbar-cloud-badge ${currentUser ? 'online' : 'offline'}" title="${currentUser ? 'Cloud sync active — Firebase connected' : 'Working locally — Sign in to sync'}" role="status" aria-live="polite">
                <span class="cloud-indicator-dot" aria-hidden="true"></span>
                <span class="cloud-label">${currentUser ? 'Synced' : 'Local'}</span>
            </div>

            <!-- Global Search (Ctrl+K) -->
            <button id="global-search-btn" class="topbar-icon-btn" title="Search & Commands (Ctrl+K)" aria-label="Open command palette">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </button>

            <!-- Theme Toggle -->
            <button id="theme-toggle-btn" class="topbar-icon-btn" title="Toggle Theme" aria-label="Switch application theme">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            </button>

            <!-- Firebase Auth User -->
            ${currentUser ? `
                <div class="user-menu-container" id="user-menu-container">
                    <button id="user-menu-btn" class="user-pill" title="Account — ${currentUser.email}" aria-label="Open account menu" aria-haspopup="true" aria-expanded="false">
                        <span class="user-pill-avatar" aria-hidden="true">${(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}</span>
                        <span class="user-pill-name">${(currentUser.displayName || currentUser.email.split('@')[0]).split(' ')[0]}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="user-pill-caret" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div id="user-dropdown" class="user-dropdown hidden" role="menu" aria-label="Account options">
                        <div class="user-dropdown-profile">
                            <span class="user-dropdown-avatar" aria-hidden="true">${(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}</span>
                            <div class="user-dropdown-info">
                                <span class="user-dropdown-name">${currentUser.displayName || 'Screenwriter'}</span>
                                <span class="user-dropdown-email">${currentUser.email}</span>
                            </div>
                        </div>
                        <div class="user-dropdown-divider" role="separator"></div>
                        <button id="user-signout-btn" class="user-dropdown-item user-dropdown-danger" role="menuitem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            ` : `
                <button id="auth-signin-btn" class="btn primary topbar-signin-btn" aria-label="Sign in to CINECORE">
                    Sign In
                </button>
            `}
        </div>
    `;
}

export function initTopbar() {
    renderTopbar();

    // Re-render when auth state changes
    appState.on('currentUser', renderTopbar);

    document.addEventListener('click', async (e) => {
        // Search button opens command palette
        if (e.target.closest('#global-search-btn')) {
            appState.set('commandPaletteOpen', true);
        }

        // Theme toggle — cycle through themes
        if (e.target.closest('#theme-toggle-btn')) {
            const themes = ['midnight', 'warm-studio', 'noir'];
            const current = document.body.getAttribute('data-theme') || 'midnight';
            const nextIndex = (themes.indexOf(current) + 1) % themes.length;
            const next = themes[nextIndex];
            document.body.setAttribute('data-theme', next);
            appState.set('theme', next);
            showToast(`Theme: ${next.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}`, 'info');
        }

        // Open Auth Modal
        if (e.target.closest('#auth-signin-btn')) {
            openAuthModal('login');
        }

        // Toggle User Menu Dropdown
        const userMenuBtn = e.target.closest('#user-menu-btn');
        if (userMenuBtn) {
            const menu = document.getElementById('user-dropdown');
            const isHidden = menu?.classList.contains('hidden');
            if (menu) {
                menu.classList.toggle('hidden');
                userMenuBtn.setAttribute('aria-expanded', String(!isHidden));
            }
        } else if (!e.target.closest('.user-menu-container')) {
            const menu = document.getElementById('user-dropdown');
            if (menu) menu.classList.add('hidden');
            document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
        }

        // Sign Out action
        if (e.target.closest('#user-signout-btn')) {
            try {
                await logoutUser();
                showToast('Signed out successfully.', 'info');
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });

    // Keyboard shortcut: Escape closes user menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const menu = document.getElementById('user-dropdown');
            if (menu && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
                document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
                document.getElementById('user-menu-btn')?.focus();
            }
        }
    });
}
