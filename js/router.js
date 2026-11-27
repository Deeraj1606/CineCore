/**
 * router.js — Hash-based SPA Router for CINECORE
 * Supports parameterized routes, view lifecycle (mount/destroy), and navigation.
 */

export class Router {
    constructor() {
        this.routes = [];
        this.currentView = null;
        this.currentRoute = null;
        this.params = {};
        this.beforeHooks = [];
        this._started = false;
    }

    /**
     * Register a route pattern and its handler.
     * Pattern supports :param syntax, e.g. '/project/:id/writer'
     * Handler signature: async (container, params) => viewInstance | void
     */
    on(pattern, handler, meta = {}) {
        const keys = [];
        const regexStr = pattern
            .replace(/[-\/\\^$*+?.()|[\]{}]/g, (m) => (m === '/' ? '\\/' : `\\${m}`))
            .replace(/:(\w+)/g, (_, key) => {
                keys.push(key);
                return '([^/]+)';
            });
        this.routes.push({
            pattern,
            regex: new RegExp(`^${regexStr}$`),
            keys,
            handler,
            meta
        });
        return this;
    }

    /** Register a before-navigation hook. Return false to cancel navigation. */
    before(fn) {
        this.beforeHooks.push(fn);
        return this;
    }

    /** Programmatic navigation */
    navigate(path) {
        if (path.startsWith('#')) {
            window.location.hash = path;
        } else {
            window.location.hash = '#' + path;
        }
    }

    /** Get current hash path */
    get path() {
        return (window.location.hash || '#/').slice(1) || '/';
    }

    /** Resolve the current hash against registered routes */
    async resolve() {
        const path = this.path;

        for (const route of this.routes) {
            const match = path.match(route.regex);
            if (match) {
                const params = {};
                route.keys.forEach((key, i) => {
                    params[key] = decodeURIComponent(match[i + 1]);
                });

                // Run before hooks
                for (const hook of this.beforeHooks) {
                    const result = await hook(path, params, route.meta);
                    if (result === false) return;
                }

                // Teardown current view
                if (this.currentView && typeof this.currentView.destroy === 'function') {
                    this.currentView.destroy();
                }

                this.params = params;
                this.currentRoute = route;

                // Mount new view
                const container = document.getElementById('app-content');
                if (container) {
                    container.innerHTML = '';
                    container.scrollTop = 0;
                }

                try {
                    this.currentView = await route.handler(container, params);
                } catch (err) {
                    console.error(`[Router] Error rendering ${path}:`, err);
                    if (container) {
                        container.innerHTML = `
                            <div class="route-error-screen">
                                <div class="route-error-card">
                                    <div class="route-error-icon">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="color:var(--cine-coral);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                    </div>
                                    <h2 class="route-error-title">View Encountered an Issue</h2>
                                    <p class="route-error-msg">${err.message || 'An unexpected error occurred while loading this view.'}</p>
                                    <div class="route-error-actions">
                                        <a href="#/" class="btn btn-primary">Return to Projects</a>
                                        <button class="btn btn-secondary" onclick="window.location.reload()">Reload Application</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }

                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('routechange', {
                    detail: { path, params, meta: route.meta }
                }));

                return;
            }
        }

        // No match — redirect to home
        console.warn(`[Router] No route matched: ${path}`);
        this.navigate('/');
    }

    /** Start listening for hash changes */
    start() {
        if (this._started) return;
        this._started = true;

        window.addEventListener('hashchange', () => this.resolve());

        // Initial resolve
        this.resolve();
    }
}

/** Singleton router instance */
export const router = new Router();
