/**
 * modal.js — Reusable Modal & Dialog System for CINECORE
 */

export class Modal {
    /**
     * @param {Object} options
     * @param {string} options.title
     * @param {string|HTMLElement} options.content
     * @param {Array<{label: string, class?: string, onClick?: Function}>} [options.actions]
     * @param {string} [options.size] - 'small' | 'medium' | 'large' | 'xlarge'
     */
    constructor(options = {}) {
        this.title = options.title || '';
        this.content = options.content || '';
        this.size = options.size || 'medium';
        this.element = null;

        if (Array.isArray(options.actions) && options.actions.length > 0) {
            this.actions = options.actions;
        } else {
            this.actions = [];
            if (options.cancelText || options.onCancel) {
                this.actions.push({
                    label: options.cancelText || 'Cancel',
                    class: 'secondary',
                    onClick: (e, m) => {
                        if (options.onCancel) options.onCancel(e, m);
                        m.close();
                    }
                });
            }
            if (options.confirmText || options.onConfirm) {
                this.actions.push({
                    label: options.confirmText || 'Confirm',
                    class: options.isDanger ? 'danger' : 'primary',
                    onClick: async (e, m) => {
                        if (options.onConfirm) {
                            const res = await options.onConfirm(e, m);
                            if (res !== false) m.close();
                        } else {
                            m.close();
                        }
                    }
                });
            }
        }
    }

    render() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-backdrop';

        const dialog = document.createElement('div');
        dialog.className = `modal-dialog modal-${this.size}`;

        let bodyHtml = typeof this.content === 'string' ? this.content : '';

        dialog.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${this.escape(this.title)}</h3>
                <button class="modal-close-btn" title="Close" aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            ${this.actions.length > 0 ? `
                <div class="modal-footer">
                    ${this.actions.map((act, i) => `
                        <button class="btn ${act.class || 'secondary'}" data-action="${i}">${this.escape(act.label)}</button>
                    `).join('')}
                </div>
            ` : ''}
        `;

        if (typeof this.content !== 'string' && this.content instanceof HTMLElement) {
            dialog.querySelector('.modal-body').appendChild(this.content);
        }

        // Close button
        dialog.querySelector('.modal-close-btn').addEventListener('click', () => this.close());

        // Overlay click outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Action buttons
        const footer = dialog.querySelector('.modal-footer');
        if (footer) {
            footer.querySelectorAll('[data-action]').forEach(btn => {
                const idx = parseInt(btn.getAttribute('data-action'), 10);
                const act = this.actions[idx];
                if (act && act.onClick) {
                    btn.addEventListener('click', (e) => act.onClick(e, this));
                }
            });
        }

        overlay.appendChild(dialog);
        this.element = overlay;
        return overlay;
    }

    open() {
        if (!this.element) {
            this.render();
        }
        document.body.appendChild(this.element);
        requestAnimationFrame(() => {
            this.element.classList.add('visible');
        });

        this._escListener = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this._escListener);
    }

    close() {
        if (this._escListener) {
            document.removeEventListener('keydown', this._escListener);
        }
        if (this.element) {
            this.element.classList.remove('visible');
            setTimeout(() => {
                this.element?.remove();
                this.element = null;
            }, 200);
        }
    }

    escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Convenience helper for confirm dialog
 */
export function confirmDialog({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
    return new Promise((resolve) => {
        const modal = new Modal({
            title,
            size: 'small',
            content: `<p class="confirm-message">${message}</p>`,
            actions: [
                {
                    label: cancelText,
                    class: 'secondary',
                    onClick: (_, m) => {
                        m.close();
                        resolve(false);
                    }
                },
                {
                    label: confirmText,
                    class: isDanger ? 'danger' : 'primary',
                    onClick: (_, m) => {
                        m.close();
                        resolve(true);
                    }
                }
            ]
        });
        modal.open();
    });
}
