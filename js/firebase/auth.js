/**
 * auth.js — Firebase Authentication Client for CINECORE
 * Handles registration, email sign-in, sign-out, password reset,
 * auth state persistence, and user profile management.
 */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config.js";
import { appState } from "../state.js";

// Ensure local persistence for cross-session survival
try {
    setPersistence(auth, browserLocalPersistence).catch(err => {
        console.warn('Auth persistence configuration note:', err.message);
    });
} catch (e) {}

/**
 * Format raw Firebase Auth errors into clear, friendly guidance
 */
export function formatAuthError(error) {
    if (!error) return 'An unexpected error occurred.';
    const code = error.code || '';
    switch (code) {
        case 'auth/email-already-in-use':
            return 'An account with this email address already exists. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Incorrect email or password. Please verify and try again.';
        case 'auth/too-many-requests':
            return 'Access temporarily locked due to many failed attempts. Try again later or reset password.';
        case 'auth/network-request-failed':
            return 'Network connection error. Check your internet connection.';
        case 'auth/popup-closed-by-user':
            return 'Google sign-in popup closed before completion.';
        case 'auth/cancelled-popup-request':
            return 'Google sign-in was cancelled.';
        case 'auth/popup-blocked':
            return 'Sign-in popup blocked by browser. Please allow popups for this site.';
        default:
            return error.message || 'Authentication failed. Please check your credentials.';
    }
}

/**
 * Register a new user with Email and Password
 */
export async function registerWithEmail(email, password, displayName = '') {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    const cleanName = displayName.trim() || email.split('@')[0];
    if (cleanName) {
        await updateProfile(user, { displayName: cleanName });
    }

    // Upsert user record in Firestore
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: cleanName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            preferences: {
                theme: 'midnight',
                autoSaveIntervalMs: 800
            }
        }, { merge: true });
    } catch (err) {
        console.warn('Firestore user doc initialization note:', err);
    }

    appState.set('currentUser', user);
    return user;
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    // Refresh last active timestamp in profile
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            email: user.email
        }, { merge: true });
    } catch (err) {
        console.warn('Firestore user login update note:', err);
    }

    appState.set('currentUser', user);
    return user;
}

/**
 * Sign in or Register using Google Provider
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    // Upsert user profile to Firestore
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.warn('Firestore user Google sign-in sync note:', err);
    }

    appState.set('currentUser', user);
    return user;
}

/**
 * Sign out current user
 */
export async function logoutUser() {
    await signOut(auth);
    appState.set('currentUser', null);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email) {
    await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Get current authenticated user synchronously
 */
export function getCurrentUser() {
    return auth.currentUser || appState.get('currentUser') || null;
}

/**
 * Subscribe to Auth State Changes
 */
export function initAuthListener(onUserChanged) {
    return onAuthStateChanged(auth, async (user) => {
        appState.set('currentUser', user);
        if (typeof onUserChanged === 'function') {
            onUserChanged(user);
        }
    });
}
