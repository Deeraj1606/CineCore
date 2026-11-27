/**
 * test_all_ui_views.mjs — Comprehensive UI Verification Test
 * Mounts all 20 views and all shell components in a simulated DOM environment.
 * Verifies that zero views throw runtime errors, unhandled rejections, or undefined reference exceptions.
 */

import { JSDOM } from 'jsdom';

// 1. Setup simulated DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CINECORE</title>
</head>
<body class="theme-dark">
    <div id="app">
        <header id="app-topbar"></header>
        <div id="app-body">
            <aside id="app-sidebar"></aside>
            <main id="app-content"></main>
        </div>
    </div>
    <div id="modal-container"></div>
    <div id="toast-container"></div>
    <div id="command-palette-overlay"></div>
    <div id="app-breadcrumb"></div>
</body>
</html>
`, {
    url: 'http://localhost:3000/#/',
    pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;
try {
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
} catch (e) {}
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

// Mock IndexedDB stores in memory
import {
    projects, screenplays, scenes, characters, locations,
    storyboards, shots, schedules, shootDays, callSheets, tasks, moodboards,
    seasons, episodes, analysisCandidates, scriptTags, events,
    breakdownItems, documents, versions
} from '../js/store.js';

class InMemoryStore {
    constructor() { this.items = new Map(); }
    async get(id) { return this.items.get(id) || null; }
    async getAll() { return Array.from(this.items.values()); }
    async getByIndex(indexName, value) {
        return Array.from(this.items.values()).filter(item => {
            if (Array.isArray(item[indexName])) return item[indexName].includes(value);
            return item[indexName] === value;
        });
    }
    async getByProject(projectId) {
        return Array.from(this.items.values()).filter(item => item.projectId === projectId);
    }
    async getForProject(projectId) {
        return Array.from(this.items.values()).find(item => item.projectId === projectId) || null;
    }
    async getByScreenplay(screenplayId) {
        return Array.from(this.items.values()).filter(item => item.screenplayId === screenplayId);
    }
    async getByScene(sceneId) {
        return Array.from(this.items.values()).filter(item => item.sceneId === sceneId);
    }
    async getByShootDay(shootDayId) {
        return Array.from(this.items.values()).filter(item => item.shootDayId === shootDayId);
    }
    async create(record) {
        const id = record.id || 'id_' + Math.random().toString(36).substr(2, 9);
        const item = { ...record, id, createdAt: Date.now(), updatedAt: Date.now() };
        this.items.set(id, item);
        return item;
    }
    async update(id, changes) {
        const existing = this.items.get(id) || {};
        const updated = { ...existing, ...changes, id, updatedAt: Date.now() };
        this.items.set(id, updated);
        return updated;
    }
    async delete(id) {
        this.items.delete(id);
        return true;
    }
}

// Override store methods with in-memory store
const allStores = [
    projects, screenplays, scenes, characters, locations,
    storyboards, shots, schedules, shootDays, callSheets, tasks, moodboards,
    seasons, episodes, analysisCandidates, scriptTags, events,
    breakdownItems, documents, versions
];

allStores.forEach(s => {
    const mem = new InMemoryStore();
    s.get = mem.get.bind(mem);
    s.getAll = mem.getAll.bind(mem);
    s.getByIndex = mem.getByIndex.bind(mem);
    s.getByProject = mem.getByProject.bind(mem);
    s.getForProject = mem.getForProject.bind(mem);
    s.getByScreenplay = mem.getByScreenplay.bind(mem);
    s.getByScene = mem.getByScene.bind(mem);
    s.getByShootDay = mem.getByShootDay.bind(mem);
    s.create = mem.create.bind(mem);
    s.update = mem.update.bind(mem);
    s.delete = mem.delete.bind(mem);
});

// Seed sample project and data
const testProject = await projects.create({
    id: 'proj_neon',
    name: 'NEON ECLIPSE',
    type: 'film',
    genre: 'Sci-Fi / Cyberpunk',
    logline: 'In an orbital station above Neo-Veridia, an amnesiac detective must solve her own murder.',
    status: 'writing'
});

// Also create a legacy project with NO type to test edge cases!
const legacyProject = await projects.create({
    id: 'proj_legacy',
    name: 'UNTITLED LEGACY DRAFT'
    // Notice: no type, no genre, no logline
});

const testScreenplay = await screenplays.create({
    id: 'sp_1',
    projectId: testProject.id,
    title: 'Neon Eclipse Draft 1',
    format: 'screenplay',
    content: `<div class="editor-block scene-heading" data-type="scene-heading" data-block-id="b1">INT. ORBITAL CORRIDOR - NIGHT</div>
<div class="editor-block action" data-type="action" data-block-id="b2">Fluorescent tubes flicker violently along the titanium walls.</div>
<div class="editor-block character" data-type="character" data-block-id="b3">MAYA</div>
<div class="editor-block dialogue" data-type="dialogue" data-block-id="b4">The transmission is failing. We have to breach the core now.</div>`
});

const testChar = await characters.create({
    id: 'char_1',
    projectId: testProject.id,
    name: 'MAYA',
    role: 'Protagonist',
    bio: 'Former syndicate runner with cybernetic sensory implants.'
});

const testLoc = await locations.create({
    id: 'loc_1',
    projectId: testProject.id,
    name: 'ORBITAL CORRIDOR',
    type: 'INT',
    region: 'Deck 4'
});

const testScene = await scenes.create({
    id: 'sc_1',
    projectId: testProject.id,
    sceneNumber: 1,
    heading: 'INT. ORBITAL CORRIDOR - NIGHT',
    locationId: testLoc.id,
    characterIds: [testChar.id],
    pages: 1.125
});

const testShot = await shots.create({
    id: 'shot_1',
    projectId: testProject.id,
    sceneId: testScene.id,
    shotNumber: '1A',
    shotType: 'CU',
    movement: 'Tracking',
    lens: '35mm'
});

const testCandidate = await analysisCandidates.create({
    id: 'cand_1',
    projectId: testProject.id,
    entityType: 'character',
    candidateName: 'MAYA',
    status: 'pending',
    confidence: 0.95,
    contextSnippet: 'MAYA stands over the terminal.'
});

// Import views
import { initTopbar } from '../js/components/topbar.js';
import { initSidebar } from '../js/components/sidebar.js';
import { initCommandPalette } from '../js/components/command-palette.js';

import { renderHome } from '../js/views/home.js';
import { renderProjectNew } from '../js/views/project-new.js';
import { renderProjectOverview } from '../js/views/project-overview.js';
import { renderWriter } from '../js/writer/writer.js';
import { renderAnalysis } from '../js/views/analysis.js';
import { renderScenes } from '../js/views/scenes.js';
import { renderStoryboard } from '../js/views/storyboard.js';
import { renderShotList } from '../js/views/shotlist.js';
import { renderCallSheet } from '../js/views/callsheet.js';
import { renderMoodboard } from '../js/views/moodboard.js';
import { renderTasks } from '../js/views/tasks.js';
import { renderSeasonManager } from '../js/views/season-manager.js';
import { renderCharacters } from '../js/views/characters.js';
import { renderCharacterDetail } from '../js/views/character-detail.js';
import { renderLocations } from '../js/views/locations.js';
import { renderLocationDetail } from '../js/views/location-detail.js';
import { renderStory } from '../js/views/story.js';
import { renderBreakdown } from '../js/views/breakdown.js';
import { renderSchedule } from '../js/views/schedule.js';
import { renderAssets } from '../js/views/assets.js';
import { renderSettings } from '../js/views/settings.js';

const container = document.getElementById('app-content');

console.log('🧪 Starting Full UI Views Verification Suite...\n');

let passedCount = 0;
let failedCount = 0;

async function testView(name, renderFn, params = {}) {
    process.stdout.write(`Testing [${name}]... `);
    try {
        container.innerHTML = '';
        await renderFn(container, params);
        if (container.innerHTML.trim().length === 0) {
            throw new Error('View rendered empty HTML.');
        }
        console.log(`✅ PASSED (${container.innerHTML.length} bytes rendered)`);
        passedCount++;
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        console.error(err.stack);
        failedCount++;
    }
}

// Test Shell Components
try {
    process.stdout.write('Testing Shell: Topbar... ');
    initTopbar();
    console.log('✅ PASSED');
    passedCount++;

    process.stdout.write('Testing Shell: Sidebar... ');
    initSidebar();
    console.log('✅ PASSED');
    passedCount++;

    process.stdout.write('Testing Shell: Command Palette... ');
    initCommandPalette();
    console.log('✅ PASSED');
    passedCount++;
} catch (err) {
    console.log(`❌ Shell component failure: ${err.message}`);
    failedCount++;
}

// Test All Views
await testView('Home View (with legacy untyped project)', renderHome);
await testView('Project New Wizard', renderProjectNew);
await testView('Project Overview (Typed Project)', renderProjectOverview, { id: testProject.id });
await testView('Project Overview (Legacy Project)', renderProjectOverview, { id: legacyProject.id });
await testView('Writer View', renderWriter, { id: testProject.id });
await testView('Analysis / Script Intelligence', renderAnalysis, { id: testProject.id });
await testView('Scenes Hub', renderScenes, { id: testProject.id });
await testView('Storyboard View', renderStoryboard, { id: testProject.id });
await testView('Shot List View', renderShotList, { id: testProject.id });
await testView('Call Sheet View', renderCallSheet, { id: testProject.id });
await testView('Moodboard View', renderMoodboard, { id: testProject.id });
await testView('Production Tasks Kanban', renderTasks, { id: testProject.id });
await testView('Season Manager', renderSeasonManager, { id: testProject.id });
await testView('Characters View', renderCharacters, { id: testProject.id });
await testView('Character Detail View', renderCharacterDetail, { id: testProject.id, cid: testChar.id });
await testView('Locations View', renderLocations, { id: testProject.id });
await testView('Location Detail View', renderLocationDetail, { id: testProject.id, lid: testLoc.id });
await testView('Story View', renderStory, { id: testProject.id });
await testView('Breakdown View', renderBreakdown, { id: testProject.id });
await testView('Schedule Stripboard View', renderSchedule, { id: testProject.id });
await testView('Assets View', renderAssets, { id: testProject.id });
await testView('Settings View (Typed Project)', renderSettings, { id: testProject.id });
await testView('Settings View (Legacy Project)', renderSettings, { id: legacyProject.id });

console.log(`\n========================================`);
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log(`========================================`);

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
