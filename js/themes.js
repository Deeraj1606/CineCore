/**
 * themes.js - CSS Custom Properties Theme Controller
 * Manages instant theme switching without page reloads using CSS variables.
 */

export const THEMES = [
    { id: 'midnight', name: 'Midnight Slate (Default)' },
    { id: 'dark-cine', name: 'Dark Cine (Dark Paper)' },
    { id: 'hollywood', name: 'Classic Hollywood (Light)' },
    { id: 'noir', name: 'Studio Noir (High Contrast)' }
];

export class ThemeManager {
    constructor(initialTheme = 'midnight') {
        this.currentTheme = initialTheme;
        this.apply(initialTheme);
    }

    apply(themeId) {
        const found = THEMES.find(t => t.id === themeId);
        const activeId = found ? found.id : 'midnight';

        this.currentTheme = activeId;
        document.body.setAttribute('data-theme', activeId);
        localStorage.setItem('cinecore-theme', activeId);
        return activeId;
    }

    getTheme() {
        return this.currentTheme;
    }

    getThemes() {
        return THEMES;
    }
}
