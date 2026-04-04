'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Local / standard hosting: use explicit firebaseConfig so Storage bucket and Auth match .env.
 * Firebase App Hosting without env vars: falls back to initializeApp() with no args, then config.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    const hasExplicitWebConfig = Boolean(
      firebaseConfig.projectId && firebaseConfig.apiKey
    );

    if (hasExplicitWebConfig) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        if (process.env.NODE_ENV === "production") {
          console.warn(
            "Automatic Firebase initialization failed. Falling back to firebase config object.",
            e
          );
        }
        firebaseApp = initializeApp(firebaseConfig);
      }
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
