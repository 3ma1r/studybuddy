import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

if (getApps().length === 0) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      // Handle private key format - replace literal \n with actual newlines
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      // Remove quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      // Replace \n with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } catch (error: any) {
      console.error('Failed to initialize Firebase Admin:', error.message);
      // Don't initialize if there's an error
    }
  } else {
    // For development, we'll use a mock (not recommended for production)
    console.warn('Firebase Admin not configured. API routes may not work properly.');
  }
} else {
  adminApp = getApps()[0];
}

export async function verifyIdToken(token: string): Promise<string | null> {
  try {
    if (!adminApp) {
      console.error('Firebase Admin app not initialized');
      return null;
    }
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error: any) {
    console.error('Token verification failed:', error?.message || error);
    return null;
  }
}
