/**
 * state.js — Global Application State Manager for CINECORE
 * Lightweight reactive state with event-based subscriptions.
 */

class AppState {
    constructor() {
        this._state = {
            currentProject: null,
            currentSeason: null,
            currentEpisode: null,
            currentScreenplay: null,
            sidebarCollapsed: false,
            rightPanelOpen: false,
            theme: 'midnight',
            commandPaletteOpen: false,
            searchOpen: false,
        };
        this._listeners = new Map();
    }

    /** Get a state value */
    get(key) {
        return this._state[key];
    }

    /** Set a state value and notify listeners */
    set(key, value) {
        const oldValue = this._state[key];
        if (oldValue === value) return;

        this._state[key] = value;
        this._notify(key, value, oldValue);
    }

    /** Update multiple state values at once */
    batch(updates) {
        const changes = [];
        for (const [key, value] of Object.entries(updates)) {
            const oldValue = this._state[key];
            if (oldValue !== value) {
                this._state[key] = value;
                changes.push({ key, value, oldValue });
            }
        }
        // Notify after all updates
        for (const { key, value, oldValue } of changes) {
            this._notify(key, value, oldValue);
        }
    }

    /** Subscribe to state changes for a specific key */
    on(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const set = this._listeners.get(key);
            if (set) set.delete(callback);
        };
    }

    /** Subscribe to any state change */
    onAny(callback) {
        return this.on('*', callback);
    }

    /** Get a snapshot of all state */
    snapshot() {
        return { ...this._state };
    }

    /** Notify listeners */
    _notify(key, value, oldValue) {
        const keyListeners = this._listeners.get(key);
        if (keyListeners) {
            for (const cb of keyListeners) {
                try { cb(value, oldValue, key); } catch (e) { console.error('[State]', e); }
            }
        }
        const anyListeners = this._listeners.get('*');
        if (anyListeners) {
            for (const cb of anyListeners) {
                try { cb(value, oldValue, key); } catch (e) { console.error('[State]', e); }
            }
        }
    }
}

/** Singleton state instance */
export const appState = new AppState();
