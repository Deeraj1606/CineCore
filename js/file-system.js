/**
 * file-system.js - File System Access API Integration
 * Enables direct local file reading, frictionless saving (Ctrl+S),
 * Save As, and graceful fallbacks for browsers without the API.
 */

let activeFileHandle = null;

export function hasActiveFileHandle() {
    return activeFileHandle !== null;
}

export function getActiveFileName() {
    return activeFileHandle ? activeFileHandle.name : null;
}

export function clearActiveFileHandle() {
    activeFileHandle = null;
}

/**
 * Open a screenplay file (.fountain, .txt, .cinecore)
 */
export async function openLocalFile() {
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Screenplay Files (*.fountain, *.txt, *.cinecore)',
                        accept: {
                            'text/plain': ['.fountain', '.txt'],
                            'application/json': ['.cinecore']
                        }
                    }
                ],
                multiple: false
            });

            const file = await handle.getFile();
            const text = await file.text();
            activeFileHandle = handle;

            return {
                filename: file.name,
                content: text,
                extension: file.name.split('.').pop().toLowerCase()
            };
        } catch (err) {
            if (err.name === 'AbortError') return null; // User cancelled
            console.warn('showOpenFilePicker error, falling back to input:', err);
        }
    }

    // Fallback using standard input file picker
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.fountain,.txt,.cinecore';

        input.onchange = async () => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const text = await file.text();
                resolve({
                    filename: file.name,
                    content: text,
                    extension: file.name.split('.').pop().toLowerCase()
                });
            } else {
                resolve(null);
            }
        };

        input.click();
    });
}

/**
 * Save directly to the existing active file handle, or prompt Save As if none bound
 */
export async function saveToActiveFile(content, fallbackTitle = 'screenplay', ext = 'fountain') {
    if (activeFileHandle && 'createWritable' in activeFileHandle) {
        try {
            const writable = await activeFileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return {
                success: true,
                filename: activeFileHandle.name
            };
        } catch (err) {
            console.warn('Failed to write to existing file handle, prompting Save As:', err);
        }
    }

    return saveAsLocalFile(content, fallbackTitle, ext);
}

/**
 * Prompt user with Save As dialog
 */
export async function saveAsLocalFile(content, defaultTitle = 'screenplay', ext = 'fountain') {
    const cleanTitle = (defaultTitle || 'screenplay').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const suggestedName = `${cleanTitle}.${ext}`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: ext === 'fountain' ? 'Fountain Screenplay (*.fountain)' : 'Plain Text (*.txt)',
                        accept: {
                            'text/plain': [`.${ext}`]
                        }
                    }
                ]
            });

            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            activeFileHandle = handle;

            return {
                success: true,
                filename: handle.name
            };
        } catch (err) {
            if (err.name === 'AbortError') return null; // Cancelled
            console.warn('showSaveFilePicker failed, falling back to Blob download:', err);
        }
    }

    // Fallback: Trigger Blob Download
    downloadBlob(content, suggestedName, 'text/plain');
    return {
        success: true,
        filename: suggestedName
    };
}

/**
 * Trigger browser file download
 */
export function downloadBlob(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
