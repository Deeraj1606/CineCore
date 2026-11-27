/**
 * storage.js — Cloud Storage Client for CINECORE
 * Handles asset uploads (moodboard references, screenplay exports, avatars),
 * progress tracking, size/MIME validation, and Spark plan safety limits.
 */

import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "firebase/storage";
import { storage } from "./config.js";
import { getCurrentUser } from "./auth.js";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit for Spark plan safety

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/json'
];

/**
 * Validate file before uploading
 */
export function validateUploadFile(file) {
    if (!file) throw new Error('No file provided.');
    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File exceeds the 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    }
    const type = file.type || '';
    if (type && !ALLOWED_MIME_TYPES.some(m => type === m || (m.endsWith('/*') && type.startsWith(m.replace('/*', ''))))) {
        throw new Error(`Unsupported file type (${type}). Allowed: images, PDFs, text scripts.`);
    }
    return true;
}

/**
 * Upload a project file to Cloud Storage with live progress callback
 * Path structure: projects/{projectId}/{folder}/{safeFilename}
 */
export function uploadProjectFile(projectId, file, folder = 'assets', onProgress) {
    const user = getCurrentUser();
    if (!user) throw new Error('Authentication required to upload project files.');

    validateUploadFile(file);

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const storageRef = ref(storage, `projects/${projectId}/${folder}/${safeName}`);

    const metadata = {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
            uploadedBy: user.uid,
            originalName: file.name,
            projectId
        }
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (typeof onProgress === 'function') {
                    onProgress(progress, snapshot.state);
                }
            },
            (error) => {
                console.error('[Storage] Upload error:', error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        name: file.name,
                        storagePath: uploadTask.snapshot.ref.fullPath,
                        downloadURL,
                        size: file.size,
                        type: file.type
                    });
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
}

/**
 * Delete a file from Cloud Storage
 */
export async function deleteStorageFile(storagePath) {
    if (!storagePath) return;
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
}
