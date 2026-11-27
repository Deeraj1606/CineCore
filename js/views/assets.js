/**
 * assets.js — Asset Management & Moodboard for CINECORE
 * Delegates to the unified Moodboard & Aesthetics engine.
 */
import { renderMoodboard } from './moodboard.js';

export async function renderAssets(container, params) {
    return renderMoodboard(container, params);
}
