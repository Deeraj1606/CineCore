/**
 * export.js — Professional Screenplay Export & Import Engine for CINECORE
 * "THE WRITER IS A CORE APPLICATION SUBSYSTEM, NOT AN ORDINARY TEXT BOX."
 * 
 * Supports:
 * - Industry Standard Printable PDF with cover title page, Courier Prime 12pt,
 *   exact 1.5in left & 1in right/top/bottom margins, top-right page numbering,
 *   watermarks, and dual dialogue.
 * - Final Draft XML (.fdx) compliant with Final Draft 11/12/13.
 * - Standards-compliant Fountain (.fountain) export & import.
 * - Plain text (.txt) export.
 * - Direct screenplay file importer (.fountain, .txt, .fdx).
 */

import { extractEditorBlocks, createBlock } from '../editor.js';

/**
 * Generates standards-compliant Fountain format with Title Page headers and Dual Dialogue
 */
export function generateFountain(editor, screenplay = {}, project = {}) {
    const title = (screenplay.title || project.name || 'UNTITLED').trim();
    const author = (screenplay.author || project.author || 'SCREENWRITER').trim();
    const draft = screenplay.draftVersion || 'First Draft';
    const contact = screenplay.contact || '';
    const notes = screenplay.notes || '';

    let fountain = `Title: ${title.toUpperCase()}\nCredit: Written by\nAuthor: ${author}\n`;
    if (screenplay.sourceMaterial) {
        fountain += `Source: ${screenplay.sourceMaterial}\n`;
    }
    fountain += `Draft date: ${new Date().toLocaleDateString()}\n`;
    if (contact) {
        fountain += `Contact: ${contact.replace(/\n/g, ' ')}\n`;
    }
    if (notes) {
        fountain += `Notes: ${notes.replace(/\n/g, ' ')}\n`;
    }
    fountain += `\n===\n\n`; // End of Title Page in Fountain standard

    const blocks = extractEditorBlocks(editor);
    let prevType = '';

    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const type = b.type;
        const text = (b.text || '').trim();
        if (!text && type !== 'dual-dialogue') continue;

        switch (type) {
            case 'scene-heading':
                // Check if starts with standard prefix; if not, force with leading period
                if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i.test(text)) {
                    fountain += `\n${text.toUpperCase()}\n\n`;
                } else {
                    fountain += `\n.${text.toUpperCase()}\n\n`;
                }
                break;

            case 'action':
                // Escape uppercase action so it doesn't get mistaken for character cue
                if (/^[A-Z0-9\s\.\(\)\_'\-]{2,}$/.test(text) && !text.startsWith('!')) {
                    fountain += `!${text}\n\n`;
                } else {
                    fountain += `${text}\n\n`;
                }
                break;

            case 'character':
                // Fountain syntax: uppercase cue. If dual dialogue second character, append caret ^
                if (b.isDual) {
                    fountain += `${text.toUpperCase()} ^\n`;
                } else {
                    fountain += `${text.toUpperCase()}\n`;
                }
                break;

            case 'parenthetical':
                fountain += `(${text.replace(/^\(|\)$/g, '').trim()})\n`;
                break;

            case 'dialogue':
                fountain += `${text}\n\n`;
                break;

            case 'transition':
                if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:|MATCH CUT TO:|JUMP CUT TO:|SMASH CUT TO:)/i.test(text)) {
                    fountain += `\n${text.toUpperCase()}\n\n`;
                } else {
                    fountain += `\n> ${text.toUpperCase()}\n\n`;
                }
                break;

            case 'shot':
                fountain += `.${text.toUpperCase()}\n\n`;
                break;

            case 'script-note':
                fountain += `[[${text}]]\n\n`;
                break;

            default:
                fountain += `${text}\n\n`;
                break;
        }

        prevType = type;
    }

    return fountain.trim() + '\n';
}

/**
 * Generates industry-compliant Final Draft XML (.fdx)
 */
export function generateFDX(editor, screenplay = {}, project = {}) {
    const title = escapeXml(screenplay.title || project.name || 'UNTITLED');
    const author = escapeXml(screenplay.author || project.author || 'SCREENWRITER');
    const draft = escapeXml(screenplay.draftVersion || 'First Draft');
    const contact = escapeXml(screenplay.contact || '');

    const blocks = extractEditorBlocks(editor);

    let paragraphsXml = '';

    for (const b of blocks) {
        const text = escapeXml((b.text || '').trim());
        if (!text) continue;

        let fdxType = 'Action';
        switch (b.type) {
            case 'scene-heading':
                fdxType = 'Scene Heading';
                break;
            case 'character':
                fdxType = 'Character';
                break;
            case 'parenthetical':
                fdxType = 'Parenthetical';
                break;
            case 'dialogue':
                fdxType = 'Dialogue';
                break;
            case 'transition':
                fdxType = 'Transition';
                break;
            case 'shot':
                fdxType = 'Shot';
                break;
            case 'script-note':
                paragraphsXml += `    <Paragraph Type="Action">\n      <ScriptNote>\n        <Paragraph>\n          <Text>${text}</Text>\n        </Paragraph>\n      </ScriptNote>\n    </Paragraph>\n`;
                continue;
            default:
                fdxType = 'Action';
                break;
        }

        paragraphsXml += `    <Paragraph Type="${fdxType}">\n      <Text>${text}</Text>\n    </Paragraph>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="3">
  <Content>
${paragraphsXml}  </Content>
  <TitlePage>
    <Header>
      <Paragraph Alignment="Left">
        <Text></Text>
      </Paragraph>
    </Header>
    <Content>
      <Paragraph Alignment="Center">
        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Prime" RevisionID="0" Size="12" Style="Bold+Underline">${title.toUpperCase()}</Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text></Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Prime" RevisionID="0" Size="12" Style="">Written by</Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text></Text>
      </Paragraph>
      <Paragraph Alignment="Center">
        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Prime" RevisionID="0" Size="12" Style="">${author}</Text>
      </Paragraph>
      <Paragraph Alignment="Left">
        <Text></Text>
      </Paragraph>
      <Paragraph Alignment="Left">
        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Prime" RevisionID="0" Size="10" Style="">${draft} - ${new Date().toLocaleDateString()}</Text>
      </Paragraph>
      <Paragraph Alignment="Left">
        <Text AdornmentStyle="0" Background="#FFFFFFFFFFFF" Color="#000000000000" Font="Courier Prime" RevisionID="0" Size="10" Style="">${contact}</Text>
      </Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;
}

/**
 * Triggers Pixel-Perfect Industry Standard Screenplay PDF Printing
 * Renders dedicated print container formatted with:
 * - Cover Title Page
 * - Standard 12pt Courier Prime typography
 * - Margin Scene Numbers (Left & Right) if selected
 * - Page numbers in top-right margin
 * - Watermark if specified
 */
export function printScreenplayPDF(editor, screenplay = {}, project = {}, options = {}) {
    const {
        includeTitlePage = true,
        showSceneNumbers = false,
        watermark = '',
        revisionColor = 'white'
    } = options;

    const title = (screenplay.title || project.name || 'UNTITLED').trim();
    const author = (screenplay.author || project.author || 'SCREENWRITER').trim();
    const draft = screenplay.draftVersion || 'First Draft';
    const source = screenplay.sourceMaterial || '';
    const contact = screenplay.contact || '';

    // Create an isolated printable iframe or print container
    let printFrame = document.getElementById('cinecore-print-frame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'cinecore-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;

    // Build blocks HTML with scene numbering if requested
    const blocks = extractEditorBlocks(editor);
    let sceneCounter = 1;
    let bodyHtml = '';

    for (const b of blocks) {
        if (b.type === 'script-note') continue; // Hide private notes in output
        const text = escapeXml(b.text || '');

        if (b.type === 'scene-heading') {
            const scNum = sceneCounter++;
            const numLeft = showSceneNumbers ? `<span class="pdf-sc-num-left">${scNum}</span>` : '';
            const numRight = showSceneNumbers ? `<span class="pdf-sc-num-right">${scNum}</span>` : '';
            bodyHtml += `<div class="pdf-block scene-heading">${numLeft}${text}${numRight}</div>\n`;
        } else if (b.type === 'dual-dialogue') {
            bodyHtml += `<div class="pdf-dual-row">${b.html || text}</div>\n`;
        } else {
            bodyHtml += `<div class="pdf-block ${b.type}">${text}</div>\n`;
        }
    }

    const titlePageHtml = includeTitlePage ? `
        <div class="pdf-title-page">
            <div class="pdf-title-top-space"></div>
            <div class="pdf-title-center">
                <h1 class="pdf-title-text">${title.toUpperCase()}</h1>
                <div class="pdf-byline-text">Written by</div>
                <div class="pdf-author-text">${author}</div>
                ${source ? `<div class="pdf-source-text">Based on: ${source}</div>` : ''}
            </div>
            <div class="pdf-title-bottom">
                <div class="pdf-draft-info">
                    ${draft} • ${new Date().toLocaleDateString()}<br>
                    ${revisionColor !== 'white' ? `<span class="pdf-rev-pill">${revisionColor.toUpperCase()} REVISION</span>` : ''}
                </div>
                ${contact ? `<div class="pdf-contact-info">${escapeXml(contact).replace(/\n/g, '<br>')}</div>` : ''}
            </div>
        </div>
    ` : '';

    const watermarkHtml = watermark ? `<div class="pdf-watermark">${escapeXml(watermark)}</div>` : '';

    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html>
<html>
<head>
    <title>${title} — Screenplay</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin-top: 1in;
            margin-bottom: 1in;
            margin-left: 1.5in;
            margin-right: 1in;
            @top-right {
                content: counter(page) ".";
                font-family: 'Courier Prime', Courier, monospace;
                font-size: 10pt;
            }
        }
        @page:first {
            margin: 0;
            @top-right { content: normal; }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 12pt;
            line-height: 1.15;
            color: #000000;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Title Page */
        .pdf-title-page {
            page-break-after: always;
            height: 11in;
            width: 8.5in;
            padding: 2.5in 1.5in 1in 1.5in;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }
        .pdf-title-center {
            text-align: center;
            margin-top: 2in;
        }
        .pdf-title-text {
            font-size: 14pt;
            font-weight: 700;
            text-decoration: underline;
            letter-spacing: 0.05em;
            margin-bottom: 1.5em;
        }
        .pdf-byline-text {
            font-size: 11pt;
            margin-bottom: 0.6em;
        }
        .pdf-author-text {
            font-size: 12pt;
            font-weight: 700;
        }
        .pdf-source-text {
            font-size: 10pt;
            font-style: italic;
            margin-top: 1em;
        }
        .pdf-title-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10pt;
            line-height: 1.4;
            padding-bottom: 0.5in;
        }
        .pdf-rev-pill {
            display: inline-block;
            margin-top: 4px;
            font-weight: bold;
            font-size: 9pt;
            padding: 2px 6px;
            border: 1px solid #000;
        }

        /* Screenplay Body Typography */
        .pdf-screenplay-body {
            position: relative;
            padding-top: 0.25in;
        }
        .pdf-block {
            position: relative;
            page-break-inside: avoid;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .pdf-block.scene-heading {
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 1.15em;
            margin-bottom: 0.55em;
        }
        .pdf-block.scene-heading:first-child {
            margin-top: 0;
        }
        .pdf-block.action {
            margin-top: 0.35em;
            margin-bottom: 0.65em;
        }
        .pdf-block.character {
            text-transform: uppercase;
            margin-left: 2.1in;
            margin-top: 0.85em;
            margin-bottom: 0;
            width: fit-content;
        }
        .pdf-block.parenthetical {
            margin-left: 1.5in;
            width: 2.4in;
            margin-top: 0;
            margin-bottom: 0;
        }
        .pdf-block.dialogue {
            margin-left: 1.0in;
            width: 3.6in;
            margin-top: 0;
            margin-bottom: 0.65em;
        }
        .pdf-block.transition {
            text-align: right;
            text-transform: uppercase;
            margin-top: 0.85em;
            margin-bottom: 0.85em;
        }
        .pdf-block.shot {
            text-transform: uppercase;
            margin-top: 0.85em;
            margin-bottom: 0.55em;
        }

        /* Dual Dialogue */
        .pdf-dual-row {
            display: flex;
            gap: 0.4in;
            margin-top: 0.8em;
            margin-bottom: 0.65em;
            page-break-inside: avoid;
        }
        .pdf-dual-col {
            flex: 1;
            width: 48%;
        }

        /* Scene Numbers */
        .pdf-sc-num-left {
            position: absolute;
            left: -0.8in;
            font-weight: 400;
            font-size: 11pt;
        }
        .pdf-sc-num-right {
            position: absolute;
            right: -0.6in;
            font-weight: 400;
            font-size: 11pt;
        }

        /* Watermark */
        .pdf-watermark {
            position: fixed;
            top: 45%;
            left: 15%;
            transform: rotate(-35deg);
            font-size: 64pt;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.08);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            pointer-events: none;
            z-index: 9999;
        }
    </style>
</head>
<body>
    ${watermarkHtml}
    ${titlePageHtml}
    <div class="pdf-screenplay-body">
        ${bodyHtml}
    </div>
</body>
</html>`);
    frameDoc.close();

    setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
    }, 350);
}

/**
 * Parses and imports an external screenplay file (.fountain, .txt, .fdx)
 */
export async function parseAndImportFile(file) {
    const text = await file.text();
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.fdx')) {
        return parseFDXContent(text);
    } else {
        return parseFountainContent(text);
    }
}

/**
 * Parses Fountain plain text into CINECORE screenplay blocks
 */
export function parseFountainContent(fountainText) {
    const lines = fountainText.split(/\r?\n/);
    const blocks = [];

    let inTitlePage = true;
    let titleMeta = {};
    let prevType = 'scene-heading';

    for (let rawLine of lines) {
        const line = rawLine.trim();

        // Check for end of title page
        if (inTitlePage && line === '===') {
            inTitlePage = false;
            continue;
        }

        // Title page metadata lines
        if (inTitlePage) {
            if (!line) continue;
            const match = line.match(/^([A-Za-z\s]+):\s*(.*)$/);
            if (match) {
                const key = match[1].toLowerCase().trim();
                titleMeta[key] = match[2].trim();
                continue;
            } else if (blocks.length === 0 && !line.includes(':')) {
                // After title metadata or no title metadata present
                inTitlePage = false;
            }
        }

        if (!line) continue;

        let type = 'action';
        const upper = line.toUpperCase();

        // Scene Heading
        if (line.startsWith('.') && !line.startsWith('..')) {
            type = 'scene-heading';
            blocks.push({ type, text: line.slice(1).trim().toUpperCase() });
            prevType = type;
            continue;
        } else if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i.test(upper)) {
            type = 'scene-heading';
            blocks.push({ type, text: upper });
            prevType = type;
            continue;
        }

        // Transition
        if (line.startsWith('>') && !line.endsWith('<')) {
            type = 'transition';
            blocks.push({ type, text: line.slice(1).trim().toUpperCase() });
            prevType = type;
            continue;
        } else if (upper.endsWith('TO:') || upper === 'FADE OUT.' || upper === 'FADE IN:') {
            type = 'transition';
            blocks.push({ type, text: upper });
            prevType = type;
            continue;
        }

        // Parenthetical
        if (line.startsWith('(') && line.endsWith(')')) {
            type = 'parenthetical';
            blocks.push({ type, text: line });
            prevType = type;
            continue;
        }

        // Script Note
        if (line.startsWith('[[') && line.endsWith(']]')) {
            type = 'script-note';
            blocks.push({ type, text: line.slice(2, -2).trim() });
            continue;
        }

        // Character Cue (Uppercase 2-35 chars preceded by blank or action)
        if (/^[A-Z0-9\s\.\(\)\_'\-]{2,35}$/.test(line) && prevType !== 'character' && !upper.startsWith('EXT.') && !upper.startsWith('INT.')) {
            type = 'character';
            blocks.push({ type, text: line.replace(/\^$/, '').trim().toUpperCase() });
            prevType = type;
            continue;
        }

        // Dialogue
        if (prevType === 'character' || prevType === 'parenthetical') {
            type = 'dialogue';
            blocks.push({ type, text: line });
            prevType = type;
            continue;
        }

        // Default Action
        blocks.push({ type: 'action', text: line.startsWith('!') ? line.slice(1) : line });
        prevType = 'action';
    }

    return {
        metadata: titleMeta,
        blocks: blocks.length > 0 ? blocks : [{ type: 'scene-heading', text: 'INT. SCENE START - DAY' }]
    };
}

/**
 * Parses Final Draft XML (.fdx) text
 */
export function parseFDXContent(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const paragraphs = doc.querySelectorAll('Content > Paragraph');
    const blocks = [];

    paragraphs.forEach(p => {
        const typeAttr = p.getAttribute('Type') || 'Action';
        const textNodes = p.querySelectorAll('Text');
        let text = Array.from(textNodes).map(t => t.textContent).join('').trim();
        if (!text) return;

        let type = 'action';
        switch (typeAttr.toLowerCase()) {
            case 'scene heading':
                type = 'scene-heading';
                text = text.toUpperCase();
                break;
            case 'character':
                type = 'character';
                text = text.toUpperCase();
                break;
            case 'parenthetical':
                type = 'parenthetical';
                break;
            case 'dialogue':
                type = 'dialogue';
                break;
            case 'transition':
                type = 'transition';
                text = text.toUpperCase();
                break;
            case 'shot':
                type = 'shot';
                text = text.toUpperCase();
                break;
            default:
                type = 'action';
                break;
        }

        blocks.push({ type, text });
    });

    return {
        metadata: {},
        blocks: blocks.length > 0 ? blocks : [{ type: 'scene-heading', text: 'INT. SCENE START - DAY' }]
    };
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

