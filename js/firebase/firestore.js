/**
 * firestore.js — Cloud Firestore Database & Real-Time Collaboration Service
 * Handles data modeling, CRUD, sub-collections, role-based sharing, and live listeners.
 */

import {
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "firebase/firestore";
import { db } from "./config.js";
import { getCurrentUser } from "./auth.js";

/**
 * -------------------------------------------------------------
 * 1. PROJECT MANAGEMENT & ROLE-BASED ACCESS
 * -------------------------------------------------------------
 */

/**
 * Create a new Cloud Project
 */
export async function createCloudProject(projectData, user) {
    const u = user || getCurrentUser();
    if (!u) throw new Error('Authentication required to create cloud projects.');

    const projectId = projectData.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const projectRef = doc(db, 'projects', projectId);

    const newProject = {
        id: projectId,
        name: (projectData.name || 'Untitled Project').trim(),
        type: projectData.type || 'film',
        genre: projectData.genre || 'Drama',
        logline: projectData.logline || '',
        status: projectData.status || 'writing',
        ownerId: u.uid,
        ownerEmail: u.email || '',
        members: {
            [u.uid]: {
                role: 'owner',
                email: u.email || '',
                displayName: u.displayName || u.email?.split('@')[0] || 'Owner',
                joinedAt: Date.now()
            }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(projectRef, newProject);
    return newProject;
}

/**
 * Retrieve a single project by ID
 */
export async function getCloudProject(projectId) {
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) return null;
    return snap.data();
}

/**
 * Query all projects where current user is Owner or Member
 */
export async function getUserCloudProjects(user) {
    const u = user || getCurrentUser();
    if (!u) return [];

    try {
        // Query projects owned by user
        const ownerQ = query(
            collection(db, 'projects'),
            where('ownerId', '==', u.uid)
        );
        const ownerSnap = await getDocs(ownerQ);
        const projectsMap = new Map();

        ownerSnap.forEach(d => projectsMap.set(d.id, d.data()));

        // Also query projects where user is in members map
        try {
            const memberQ = query(
                collection(db, 'projects'),
                where(`members.${u.uid}.role`, 'in', ['owner', 'editor', 'viewer'])
            );
            const memberSnap = await getDocs(memberQ);
            memberSnap.forEach(d => projectsMap.set(d.id, d.data()));
        } catch (memberErr) {
            console.debug('Member map query note (requires composite index in console if empty):', memberErr.message);
        }

        return Array.from(projectsMap.values());
    } catch (err) {
        console.error('Error fetching user cloud projects:', err);
        return [];
    }
}

/**
 * Update Project Metadata
 */
export async function updateCloudProject(projectId, changes) {
    const projectRef = doc(db, 'projects', projectId);
    const updated = {
        ...changes,
        updatedAt: serverTimestamp()
    };
    await updateDoc(projectRef, updated);
    return updated;
}

/**
 * Delete a Cloud Project (Owner only)
 */
export async function deleteCloudProject(projectId) {
    await deleteDoc(doc(db, 'projects', projectId));
}

/**
 * -------------------------------------------------------------
 * 2. COLLABORATION & PROJECT SHARING
 * -------------------------------------------------------------
 */

/**
 * Invite / Add a friend to a project by email with specific role
 */
export async function addProjectMember(projectId, friendEmail, role = 'editor') {
    const cleanEmail = friendEmail.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Please enter a valid email address.');

    // Find user by email in users collection
    const userQ = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
    const userSnap = await getDocs(userQ);

    let friendUid = null;
    let friendName = cleanEmail.split('@')[0];

    if (!userSnap.empty) {
        const uDoc = userSnap.docs[0];
        friendUid = uDoc.id;
        friendName = uDoc.data().displayName || friendName;
    } else {
        // Fallback placeholder ID until user registers
        friendUid = `invite_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    const projectRef = doc(db, 'projects', projectId);
    const key = `members.${friendUid}`;

    await updateDoc(projectRef, {
        [key]: {
            role, // 'editor' | 'viewer'
            email: cleanEmail,
            displayName: friendName,
            invitedAt: Date.now()
        },
        updatedAt: serverTimestamp()
    });

    return { uid: friendUid, email: cleanEmail, role, displayName: friendName };
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(projectId, memberUid) {
    const projectRef = doc(db, 'projects', projectId);
    const key = `members.${memberUid}`;
    const { deleteField } = await import("firebase/firestore");
    await updateDoc(projectRef, {
        [key]: deleteField(),
        updatedAt: serverTimestamp()
    });
}

/**
 * -------------------------------------------------------------
 * 3. SUBCOLLECTION ENTITIES (Screenplays, Scenes, Characters, etc.)
 * -------------------------------------------------------------
 */

/**
 * Save an entity record under project subcollection
 */
export async function saveCloudEntity(projectId, subcollectionName, entityId, data) {
    if (!projectId || !subcollectionName || !entityId) return;

    const ref = doc(db, 'projects', projectId, subcollectionName, entityId);
    const payload = {
        ...data,
        id: entityId,
        projectId,
        updatedAt: serverTimestamp()
    };
    await setDoc(ref, payload, { merge: true });
    return payload;
}

/**
 * Get all entities of a subcollection
 */
export async function getCloudEntities(projectId, subcollectionName) {
    if (!projectId || !subcollectionName) return [];

    const colRef = collection(db, 'projects', projectId, subcollectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data());
}

/**
 * Delete an entity from a subcollection
 */
export async function deleteCloudEntity(projectId, subcollectionName, entityId) {
    if (!projectId || !subcollectionName || !entityId) return;
    await deleteDoc(doc(db, 'projects', projectId, subcollectionName, entityId));
}

/**
 * -------------------------------------------------------------
 * 4. REAL-TIME COLLABORATION LISTENERS
 * -------------------------------------------------------------
 */

/**
 * Real-time listener for Project metadata changes
 * Returns unsubscribe function.
 */
export function subscribeToProject(projectId, onUpdate, onError) {
    if (!projectId) return () => {};
    const ref = doc(db, 'projects', projectId);
    return onSnapshot(ref, (snap) => {
        if (snap.exists() && typeof onUpdate === 'function') {
            onUpdate(snap.data());
        }
    }, (err) => {
        console.warn(`[Firestore] Subscription error on project ${projectId}:`, err);
        if (typeof onError === 'function') onError(err);
    });
}

/**
 * Real-time listener for Screenplay document changes
 * Supports live collaborative writing updates.
 */
export function subscribeToScreenplay(projectId, screenplayId, onUpdate, onError) {
    if (!projectId || !screenplayId) return () => {};
    const ref = doc(db, 'projects', projectId, 'screenplays', screenplayId);
    return onSnapshot(ref, (snap) => {
        if (snap.exists() && typeof onUpdate === 'function') {
            onUpdate(snap.data());
        }
    }, (err) => {
        console.warn(`[Firestore] Subscription error on screenplay ${screenplayId}:`, err);
        if (typeof onError === 'function') onError(err);
    });
}
