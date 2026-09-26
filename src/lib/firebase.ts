import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with resilient cache handling (multi-tab persistent cache with fallback)
function createFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, firebaseConfig.firestoreDatabaseId);
  } catch {
    try {
      return initializeFirestore(app, {
        localCache: memoryLocalCache()
      }, firebaseConfig.firestoreDatabaseId);
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom scopes for Google account if needed
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (!auth.currentUser) {
      // When unauthenticated, avoid testing restricted paths to prevent false permission/closing errors
      return true;
    }
    await getDocFromServer(doc(db, 'users', auth.currentUser.uid, 'settings', 'user_settings'));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('offline') ||
        msg.includes('closing') ||
        msg.includes('hidden') ||
        msg.includes('unavailable')
      ) {
        console.warn('Firestore client in transient state:', error.message);
      }
    }
    return false;
  }
}
