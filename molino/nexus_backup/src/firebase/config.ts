/**
 * Firebase Configuration
 * Uses environment variables for security
 * CRITICAL: Do not commit actual credentials
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const envBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

/** Default bucket for modern Firebase projects (Console → Storage). */
function defaultStorageBucketForProject(pid: string | undefined): string | undefined {
  if (!pid) return undefined;
  return `${pid}.firebasestorage.app`;
}

export const firebaseConfig = {
  projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: envBucket || defaultStorageBucketForProject(projectId),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
};

// Validate config on startup
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.warn(
    '[Firebase] Configuration incomplete. Check .env.local file. ' +
    'This is expected during development but will cause issues in production.'
  );
} else if (!firebaseConfig.storageBucket) {
  console.warn(
    '[Firebase] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing and could not be inferred from projectId. ' +
    'Cloud Storage uploads may fail until you set it in .env.local.'
  );
}
