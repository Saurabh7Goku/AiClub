import admin from 'firebase-admin';

/**
 * Firebase Admin SDK singleton.
 * Used for server-side operations that need to bypass Firestore security rules.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env variable (full JSON string).
 */
let adminAppInstance: admin.app.App | null = null;
let adminDbInstance: admin.firestore.Firestore | null = null;

export function getAdminApp(): admin.app.App {
    if (adminAppInstance) return adminAppInstance;

    if (admin.apps.length > 0) {
        adminAppInstance = admin.apps[0]!;
        return adminAppInstance;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        throw new Error(
            'FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local. ' +
            'Download a service account key from Firebase Console → Project Settings → Service Accounts.'
        );
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        adminAppInstance = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        return adminAppInstance;
    } catch (error) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', error);
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY in .env.local is not a valid JSON string.');
    }
}

export function getAdminDb(): admin.firestore.Firestore {
    if (adminDbInstance) return adminDbInstance;
    adminDbInstance = admin.firestore(getAdminApp());
    return adminDbInstance;
}

export const db = getAdminDb();

