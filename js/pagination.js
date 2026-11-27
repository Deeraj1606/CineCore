/**
 * pagination.js - Screenplay Pagination Engine
 * Standard 11-inch US Letter geometry calculations, visual page breaks, and numbering.
 */

const PAGE_HEIGHT_PX = 1056; // 11 inches at 96 DPI

export class PaginationEngine {
    constructor(editor, pageShadow, statPages) {
        this.editor = editor;
        this.pageShadow = pageShadow;
        this.statPages = statPages;
        this.timeout = null;
        this.currentPageCount = 1;
    }

    update() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.recalculate();
        }, 250);
    }

    recalculate() {
        if (!this.editor || !this.pageShadow) return;

        // Clear existing page break visuals
        this.pageShadow.querySelectorAll('.page-break-overlay, .page-number-overlay').forEach(el => el.remove());

        const editorHeight = this.editor.offsetHeight;
        const numPages = Math.max(1, Math.ceil(editorHeight / PAGE_HEIGHT_PX));
        this.currentPageCount = numPages;

        const totalMinHeight = Math.max(PAGE_HEIGHT_PX, numPages * PAGE_HEIGHT_PX);
        this.pageShadow.style.minHeight = `${totalMinHeight}px`;

        for (let i = 1; i < numPages; i++) {
            const yPos = i * PAGE_HEIGHT_PX;

            const breakLine = document.createElement('div');
            breakLine.className = 'page-break-overlay';
            breakLine.style.top = `${yPos}px`;
            this.pageShadow.appendChild(breakLine);

            const pageNum = document.createElement('div');
            pageNum.className = 'page-number-overlay';
            pageNum.style.top = `${yPos}px`;
            pageNum.textContent = `${i + 1}.`;
            this.pageShadow.appendChild(pageNum);
        }

        if (this.statPages) {
            this.statPages.textContent = `${numPages} Page${numPages !== 1 ? 's' : ''}`;
        }
    }
}
