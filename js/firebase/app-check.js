/**
 * app-check.js — Firebase App Check Configuration for CINECORE
 * Runs in monitoring mode for web development to protect backend services
 * without locking out local development or legitimate users.
 */

import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from "./config.js";

let appCheckInstance = null;

export function initAppCheck(siteKey = null) {
    if (typeof window === 'undefined') return null;
    if (appCheckInstance) return appCheckInstance;

    try {
        // In local development, enable debug token to prevent locking out devs
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        if (siteKey) {
            appCheckInstance = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(siteKey),
                isTokenAutoRefreshEnabled: true
            });
            console.log('🛡️ Firebase App Check initialized in monitoring mode.');
        } else {
            console.debug('🛡️ Firebase App Check: No reCAPTCHA siteKey provided; operating in development passthrough.');
        }
    } catch (err) {
        console.warn('App Check initialization note:', err.message);
    }

    return appCheckInstance;
}
