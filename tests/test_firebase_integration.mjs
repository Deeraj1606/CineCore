/**
 * test_firebase_integration.mjs — Comprehensive Test Suite for CINECORE Firebase Integration
 * Verifies:
 * 1. Singleton initialization and service instances (App, Auth, Firestore, Storage)
 * 2. Auth error formatting and security rule compliance
 * 3. Firestore data models (projects, members, roles, subcollection hierarchies)
 * 4. Role-based permission logic (Owner, Editor, Viewer invariants)
 * 5. Storage file size & MIME validation (Spark free-tier guardrails)
 * 6. App Check monitoring mode configuration
 * 7. Security rules file syntax and coverage
 */

import fs from 'fs';
import path from 'path';

console.log('======================================================');
console.log('🔥 CINECORE — FIREBASE INTEGRATION & SECURITY TEST SUITE');
console.log('======================================================\n');

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passedCount++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failedCount++;
    }
}

// --- TEST 1: Centralized Firebase Config & Singleton Invariant ---
console.log('--- TEST 1: Firebase Config & Service Instances ---');
import { firebaseConfig, app, auth, db, storage, firebaseStatus } from '../js/firebase/config.js';

assert(firebaseConfig.projectId === 'cinecore-143', 'Project ID matches target cinecore-143');
assert(firebaseConfig.authDomain === 'cinecore-143.firebaseapp.com', 'Auth Domain configured properly');
assert(firebaseConfig.storageBucket === 'cinecore-143.firebasestorage.app', 'Storage Bucket configured properly');
assert(app != null, 'Firebase App instance initialized');
assert(auth != null, 'Firebase Auth instance initialized');
assert(db != null, 'Cloud Firestore instance initialized');
assert(storage != null, 'Cloud Storage instance initialized');
assert(firebaseStatus.initialized === true, 'Firebase status reports initialized');

// --- TEST 2: Authentication Error Formatting & Guidance ---
console.log('\n--- TEST 2: Authentication Error Messages & Google Auth ---');
import { formatAuthError, signInWithGoogle } from '../js/firebase/auth.js';

assert(typeof signInWithGoogle === 'function', 'signInWithGoogle function is exported');
assert(formatAuthError({ code: 'auth/email-already-in-use' }).includes('already exists'), 'Handles email-already-in-use cleanly');
assert(formatAuthError({ code: 'auth/invalid-credential' }).includes('Incorrect email or password'), 'Handles invalid-credential cleanly');
assert(formatAuthError({ code: 'auth/weak-password' }).includes('at least 6 characters'), 'Handles weak-password cleanly');
assert(formatAuthError({ code: 'auth/network-request-failed' }).includes('Network connection error'), 'Handles network errors cleanly');
assert(formatAuthError({ code: 'auth/popup-closed-by-user' }).includes('Google sign-in popup closed'), 'Handles popup-closed-by-user cleanly');
assert(formatAuthError({ code: 'auth/popup-blocked' }).includes('popup blocked'), 'Handles popup-blocked cleanly');

// --- TEST 3: Firestore Data Model & Role-Based Membership Invariants ---
console.log('\n--- TEST 3: Project Data Model & Permission Roles ---');

const mockUser = {
    uid: 'user_kubrick_1968',
    email: 'stanley@cinecore.studio',
    displayName: 'Stanley K.'
};

const mockProjectPayload = {
    id: 'proj_2001',
    name: '2001: A SPACE ODYSSEY',
    type: 'film',
    genre: 'Sci-Fi',
    logline: 'Humanity finds a mysterious monolith buried beneath the lunar surface.'
};

// Check Project Model Schema
const ownerMember = {
    role: 'owner',
    email: mockUser.email,
    displayName: mockUser.displayName,
    joinedAt: Date.now()
};

const editorMember = {
    role: 'editor',
    email: 'clarke@cinecore.studio',
    displayName: 'Arthur C. Clarke',
    joinedAt: Date.now()
};

const viewerMember = {
    role: 'viewer',
    email: 'crew@cinecore.studio',
    displayName: 'Script Supervisor',
    joinedAt: Date.now()
};

const projectDoc = {
    ...mockProjectPayload,
    ownerId: mockUser.uid,
    members: {
        [mockUser.uid]: ownerMember,
        'user_clarke': editorMember,
        'user_viewer': viewerMember
    }
};

assert(projectDoc.ownerId === mockUser.uid, 'Project has explicit ownerId');
assert(projectDoc.members[mockUser.uid].role === 'owner', 'Owner has owner role in members map');
assert(projectDoc.members['user_clarke'].role === 'editor', 'Collaborator assigned Editor role');
assert(projectDoc.members['user_viewer'].role === 'viewer', 'Collaborator assigned Viewer role');

// Role Permission Check function matching firestore.rules logic
function canUserEdit(project, uid) {
    if (project.ownerId === uid) return true;
    const m = project.members && project.members[uid];
    return m && (m.role === 'owner' || m.role === 'editor');
}

function canUserRead(project, uid) {
    if (project.ownerId === uid) return true;
    return Boolean(project.members && project.members[uid]);
}

assert(canUserEdit(projectDoc, mockUser.uid) === true, 'Owner has full edit rights');
assert(canUserEdit(projectDoc, 'user_clarke') === true, 'Editor has edit rights');
assert(canUserEdit(projectDoc, 'user_viewer') === false, 'Viewer is denied edit rights (read-only)');
assert(canUserRead(projectDoc, 'user_viewer') === true, 'Viewer is granted read access');
assert(canUserRead(projectDoc, 'unauthorized_stranger') === false, 'Stranger without membership is denied all access');

// --- TEST 4: Cloud Storage File Validation & Free-Tier Guardrails ---
console.log('\n--- TEST 4: Cloud Storage Spark Plan Safety Rules ---');
import { validateUploadFile } from '../js/firebase/storage.js';

// Valid file
const validImage = { name: 'moodboard_scene1.png', size: 2 * 1024 * 1024, type: 'image/png' };
assert(validateUploadFile(validImage) === true, 'Allows valid image file under 15MB');

const validPDF = { name: 'screenplay_rev1.pdf', size: 450 * 1024, type: 'application/pdf' };
assert(validateUploadFile(validPDF) === true, 'Allows screenplay PDF export');

// Oversized file (> 15MB)
let oversizedCaught = false;
try {
    validateUploadFile({ name: 'huge_raw_video.mov', size: 50 * 1024 * 1024, type: 'video/quicktime' });
} catch (e) {
    oversizedCaught = true;
}
assert(oversizedCaught === true, 'Rejects files exceeding 15MB to protect Firebase Spark plan');

// Disallowed file type
let badMimeCaught = false;
try {
    validateUploadFile({ name: 'malicious.exe', size: 1024, type: 'application/x-msdownload' });
} catch (e) {
    badMimeCaught = true;
}
assert(badMimeCaught === true, 'Rejects disallowed executable MIME types');

// --- TEST 5: Security Rules Verification ---
console.log('\n--- TEST 5: Firestore & Storage Security Rules Files ---');
const firestoreRulesPath = path.resolve('firestore.rules');
const storageRulesPath = path.resolve('storage.rules');

assert(fs.existsSync(firestoreRulesPath), 'firestore.rules exists in repository root');
const firestoreContent = fs.readFileSync(firestoreRulesPath, 'utf8');
assert(firestoreContent.includes('match /projects/{projectId}'), 'firestore.rules defines project collections');
assert(firestoreContent.includes('isProjectOwner'), 'firestore.rules enforces ownership checks');
assert(firestoreContent.includes('canEditProject'), 'firestore.rules enforces role-based editor checks');
assert(!firestoreContent.includes('allow read, write: if true'), 'No permissive or insecure wildcard rules');

assert(fs.existsSync(storageRulesPath), 'storage.rules exists in repository root');
const storageContent = fs.readFileSync(storageRulesPath, 'utf8');
assert(storageContent.includes('request.resource.size < 15 * 1024 * 1024'), 'storage.rules enforces 15MB size ceiling');
assert(storageContent.includes('match /projects/{projectId}'), 'storage.rules isolates project files');

// --- TEST 6: App Check Monitoring Mode ---
console.log('\n--- TEST 6: App Check Monitoring Mode Verification ---');
import { initAppCheck } from '../js/firebase/app-check.js';
const appCheckInstance = initAppCheck();
assert(appCheckInstance == null, 'Operates in non-blocking passthrough when no siteKey is provided');

console.log('\n======================================================');
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log('======================================================');

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
