/**
 * config.js — Centralized Firebase Initialization for CINECORE
 * Exports singleton instances of Firebase App, Auth, Firestore, and Storage.
 * Prevents duplicate initialization during hot reloads and page transitions.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
    apiKey: "AIzaSyBB6T7ZOBNpjdN9SL8P6jws9MQO1W5IKKc",
    authDomain: "cinecore-143.firebaseapp.com",
    projectId: "cinecore-143",
    storageBucket: "cinecore-143.firebasestorage.app",
    messagingSenderId: "337406473559",
    appId: "1:337406473559:web:4c9ca875c7dc831b02ba12"
};

// Singleton App Initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Service Instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connectivity & Offline Status
export const firebaseStatus = {
    initialized: true,
    projectId: firebaseConfig.projectId,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
};

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { firebaseStatus.isOnline = true; });
    window.addEventListener('offline', () => { firebaseStatus.isOnline = false; });
}
