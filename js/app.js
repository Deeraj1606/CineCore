/**
 * app.js — CINECORE Filmmaking Operating System Core Entrypoint
 * Bootstraps IndexedDB v2, global SPA router, components, and module routes.
 */

import { router } from './router.js';
import { openDB, migrateFromLegacy, projects, screenplays } from './store.js';
import { appState } from './state.js';

// Global Components
import { initTopbar } from './components/topbar.js';
import { initSidebar } from './components/sidebar.js';
import { initCommandPalette } from './components/command-palette.js';

// Views
import { renderHome } from './views/home.js';
import { renderProjectNew } from './views/project-new.js';
import { renderProjectOverview } from './views/project-overview.js';
import { renderSeasonManager } from './views/season-manager.js';
import { renderCharacters } from './views/characters.js';
import { renderCharacterDetail } from './views/character-detail.js';
import { renderLocations } from './views/locations.js';
import { renderLocationDetail } from './views/location-detail.js';
import { renderScenes } from './views/scenes.js';
import { renderStoryboard } from './views/storyboard.js';
import { renderShotList } from './views/shotlist.js';
import { renderCallSheet } from './views/callsheet.js';
import { renderMoodboard } from './views/moodboard.js';
import { renderTasks } from './views/tasks.js';
import { renderAnalysis } from './views/analysis.js';
import { renderStory } from './views/story.js';
import { renderBreakdown } from './views/breakdown.js';
import { renderSchedule } from './views/schedule.js';
import { renderAssets } from './views/assets.js';
import { renderSettings } from './views/settings.js';

// Writer Module
import { renderWriter } from './writer/writer.js';

// Firebase Services
import { initAuthListener } from './firebase/auth.js';
import { initAppCheck } from './firebase/app-check.js';

export async function initApp() {
    if (window.__CINECORE_OS_INITIALIZED__) return;
    window.__CINECORE_OS_INITIALIZED__ = true;

    console.log('🎬 CINECORE Filmmaking Operating System initializing...');

    // 0. Initialize Firebase Auth & App Check
    try {
        initAppCheck();
        initAuthListener((user) => {
            if (user) {
                console.log(`👤 Firebase user active: ${user.email} (${user.uid})`);
            } else {
                console.log('👤 Local guest mode active');
            }
        });
    } catch (fbErr) {
        console.warn('Firebase bootstrap note:', fbErr.message);
    }

    // 1. Initialize IndexedDB Layer
    try {
        await openDB();

        // Check if there is legacy script data to migrate
        const legacyDoc = await migrateFromLegacy();
        const allProjects = await projects.getAll();

        if (legacyDoc && allProjects.length === 0) {
            console.log('📦 Migrating legacy screenplay into default project...');
            const legacyProject = await projects.create({
                name: (legacyDoc.title || 'Screenplay Project').trim(),
                type: 'film',
                genre: 'Drama',
                logline: 'Imported from legacy writer draft.',
                status: 'writing'
            });

            await screenplays.create({
                projectId: legacyProject.id,
                title: legacyDoc.title || 'Untitled',
                content: legacyDoc.content || ''
            });
        }
    } catch (err) {
        console.error('Failed to initialize database:', err);
    }

    // 2. Initialize Global Shell Components
    initTopbar();
    initSidebar();
    initCommandPalette();

    // 3. Register SPA Routes
    router
        .on('/', (container) => renderHome(container))
        .on('/projects/new', (container) => renderProjectNew(container))
        .on('/project/:id', (container, params) => renderProjectOverview(container, params))
        .on('/project/:id/writer', (container, params) => renderWriter(container, params))
        .on('/project/:id/analysis', (container, params) => renderAnalysis(container, params))
        .on('/project/:id/scenes', (container, params) => renderScenes(container, params))
        .on('/project/:id/storyboard', (container, params) => renderStoryboard(container, params))
        .on('/project/:id/shots', (container, params) => renderShotList(container, params))
        .on('/project/:id/callsheet', (container, params) => renderCallSheet(container, params))
        .on('/project/:id/moodboard', (container, params) => renderMoodboard(container, params))
        .on('/project/:id/tasks', (container, params) => renderTasks(container, params))
        .on('/project/:id/seasons', (container, params) => renderSeasonManager(container, params))
        .on('/project/:id/characters', (container, params) => renderCharacters(container, params))
        .on('/project/:id/characters/:cid', (container, params) => renderCharacterDetail(container, params))
        .on('/project/:id/character/:cid', (container, params) => renderCharacterDetail(container, params))
        .on('/project/:id/locations', (container, params) => renderLocations(container, params))
        .on('/project/:id/locations/:lid', (container, params) => renderLocationDetail(container, params))
        .on('/project/:id/location/:lid', (container, params) => renderLocationDetail(container, params))
        .on('/project/:id/story', (container, params) => renderStory(container, params))
        .on('/project/:id/breakdown', (container, params) => renderBreakdown(container, params))
        .on('/project/:id/schedule', (container, params) => renderSchedule(container, params))
        .on('/project/:id/assets', (container, params) => renderAssets(container, params))
        .on('/project/:id/settings', (container, params) => renderSettings(container, params))
        // Episodic route
        .on('/project/:id/season/:sid/episode/:eid/writer', (container, params) => renderWriter(container, params));

    // 4. Start Router
    router.start();

    console.log('✅ CINECORE OS ready.');
}

// Auto-run on DOM ready in browser
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}
