/**
 * auth-modal.js — Unified Authentication Dialog for CINECORE
 * Provides sign-in, registration, password reset, loading indicators,
 * and clear user-facing error feedback.
 */

import { registerWithEmail, loginWithEmail, sendPasswordReset, signInWithGoogle, formatAuthError } from "../firebase/auth.js";
import { showToast } from "./toast.js";

let activeModal = null;

export function openAuthModal(initialTab = 'login') {
    closeAuthModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay auth-modal-overlay';
    overlay.id = 'auth-modal-overlay';

    overlay.innerHTML = `
        <div class="modal-card auth-modal-card">
            <button class="modal-close-btn" id="auth-close-btn" title="Close" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="auth-header">
                <div class="auth-brand">
                    <span class="auth-brand-glyph">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--cine-violet)" stroke="none"><polygon points="12 2 22 12 12 22 2 12"></polygon></svg>
                    </span>
                    <span class="auth-brand-name">CINECORE</span>
                </div>
                <h3 class="auth-title" id="auth-title">Welcome to CINECORE</h3>
                <p class="auth-subtitle" id="auth-subtitle">Sign in to sync screenplays and collaborate with your team</p>
            </div>

            <!-- Google Authentication Button -->
            <button type="button" class="btn google-auth-btn" id="google-auth-btn">
                <svg class="google-icon" width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                <span id="google-btn-text">Continue with Google</span>
            </button>

            <!-- Divider -->
            <div class="auth-divider">
                <span class="auth-divider-line"></span>
                <span class="auth-divider-text">OR EMAIL</span>
                <span class="auth-divider-line"></span>
            </div>

            <!-- Tab Switcher -->
            <div class="auth-tabs">
                <button class="auth-tab ${initialTab === 'login' ? 'active' : ''}" data-tab="login">Sign In</button>
                <button class="auth-tab ${initialTab === 'register' ? 'active' : ''}" data-tab="register">Create Account</button>
            </div>

            <!-- Error / Success Alert -->
            <div class="auth-alert hidden" id="auth-alert"></div>

            <!-- Auth Form -->
            <form id="auth-form" class="auth-form">
                <div class="form-group hidden" id="auth-name-group">
                    <label class="form-label" for="auth-name">Your Name / Pseudonym</label>
                    <input type="text" id="auth-name" class="form-input" placeholder="e.g. Stanley K." autocomplete="name" />
                </div>

                <div class="form-group">
                    <label class="form-label" for="auth-email">Email Address</label>
                    <input type="email" id="auth-email" class="form-input" placeholder="writer@cinecore.studio" required autocomplete="email" />
                </div>

                <div class="form-group" id="auth-password-group">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label class="form-label" for="auth-password">Password</label>
                        <button type="button" class="auth-forgot-btn" id="auth-forgot-link">Forgot?</button>
                    </div>
                    <div class="password-input-wrap">
                        <input type="password" id="auth-password" class="form-input" placeholder="••••••••" required autocomplete="current-password" minlength="6" />
                        <button type="button" class="password-toggle-btn" id="password-toggle" title="Show/hide password" aria-label="Toggle password visibility">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary auth-submit-btn" id="auth-submit-btn">
                    <span class="btn-text">Sign In</span>
                    <span class="btn-spinner hidden" id="auth-spinner">
                        <svg class="auth-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
                    </span>
                </button>
            </form>

            <div class="auth-footer-notice">
                Protected by Firebase Authentication & Cloud Security Rules.
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    activeModal = overlay;

    // Elements
    let currentTab = initialTab; // 'login' | 'register' | 'forgot'
    const titleEl = overlay.querySelector('#auth-title');
    const subtitleEl = overlay.querySelector('#auth-subtitle');
    const nameGroup = overlay.querySelector('#auth-name-group');
    const passwordGroup = overlay.querySelector('#auth-password-group');
    const submitBtn = overlay.querySelector('#auth-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('#auth-spinner');
    const alertEl = overlay.querySelector('#auth-alert');
    const emailInput = overlay.querySelector('#auth-email');
    const passwordInput = overlay.querySelector('#auth-password');
    const nameInput = overlay.querySelector('#auth-name');
    const forgotLink = overlay.querySelector('#auth-forgot-link');
    const pwdToggle = overlay.querySelector('#password-toggle');
    const tabs = overlay.querySelectorAll('.auth-tab');

    function switchTab(tab) {
        currentTab = tab;
        alertEl.classList.add('hidden');
        alertEl.textContent = '';

        tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));

        if (tab === 'login') {
            titleEl.textContent = 'Welcome Back';
            subtitleEl.textContent = 'Sign in to access your projects and cloud workspace';
            nameGroup.classList.add('hidden');
            passwordGroup.classList.remove('hidden');
            btnText.textContent = 'Sign In';
            forgotLink.classList.remove('hidden');
        } else if (tab === 'register') {
            titleEl.textContent = 'Join CINECORE';
            subtitleEl.textContent = 'Create your private screenwriting & production account';
            nameGroup.classList.remove('hidden');
            passwordGroup.classList.remove('hidden');
            btnText.textContent = 'Create Account';
            forgotLink.classList.add('hidden');
        } else if (tab === 'forgot') {
            titleEl.textContent = 'Reset Password';
            subtitleEl.textContent = 'Enter your email to receive a password reset link';
            nameGroup.classList.add('hidden');
            passwordGroup.classList.add('hidden');
            btnText.textContent = 'Send Reset Link';
            tabs.forEach(t => t.classList.remove('active'));
        }
    }

    tabs.forEach(t => {
        t.addEventListener('click', () => switchTab(t.getAttribute('data-tab')));
    });

    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('forgot');
    });

    pwdToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        pwdToggle.innerHTML = isPassword 
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });

    // Handle Google Sign-In
    overlay.querySelector('#google-auth-btn')?.addEventListener('click', async () => {
        alertEl.classList.add('hidden');
        const googleBtn = overlay.querySelector('#google-auth-btn');
        const googleText = overlay.querySelector('#google-btn-text');
        googleBtn.disabled = true;
        googleText.textContent = 'Connecting to Google...';

        try {
            await signInWithGoogle();
            showToast('Signed in with Google!', 'success');
            closeAuthModal();
        } catch (err) {
            console.error('[Google Auth] Error:', err);
            alertEl.className = 'auth-alert auth-error';
            alertEl.textContent = formatAuthError(err);
            alertEl.classList.remove('hidden');
        } finally {
            googleBtn.disabled = false;
            googleText.textContent = 'Continue with Google';
        }
    });

    // Handle Form Submit
    overlay.querySelector('#auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        alertEl.classList.add('hidden');
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const name = nameInput.value.trim();

        try {
            if (currentTab === 'login') {
                await loginWithEmail(email, password);
                showToast('Signed in successfully!', 'success');
                closeAuthModal();
            } else if (currentTab === 'register') {
                await registerWithEmail(email, password, name);
                showToast('Account created and signed in!', 'success');
                closeAuthModal();
            } else if (currentTab === 'forgot') {
                await sendPasswordReset(email);
                alertEl.className = 'auth-alert auth-success';
                alertEl.textContent = 'Password reset email sent! Check your inbox.';
                alertEl.classList.remove('hidden');
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
                return;
            }
        } catch (err) {
            console.error('[Auth] Error:', err);
            alertEl.className = 'auth-alert auth-error';
            alertEl.textContent = formatAuthError(err);
            alertEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Close on background click or button
    overlay.querySelector('#auth-close-btn').addEventListener('click', closeAuthModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAuthModal();
    });

    // ESC key closes modal
    const onKey = (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);

    // Initial focus
    setTimeout(() => emailInput.focus(), 50);
}

export function closeAuthModal() {
    if (activeModal && activeModal.parentNode) {
        activeModal.parentNode.removeChild(activeModal);
    }
    activeModal = null;
}
