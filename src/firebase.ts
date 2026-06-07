import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without referencing firestoreDatabaseId if configured
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request Drive access scope
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

let storedAccessToken: string | null = localStorage.getItem('google_access_token');

export const googleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    if (accessToken) {
      storedAccessToken = accessToken;
      localStorage.setItem('google_access_token', accessToken);
    }
    return {
      user: result.user,
      accessToken: accessToken
    };
  } catch (error) {
    console.error("Google sign in error", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
  storedAccessToken = null;
  localStorage.removeItem('google_access_token');
};

export const initAuth = (
  onUserChange: (user: User, accessToken: string) => any,
  onClear: () => any
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user && storedAccessToken) {
      onUserChange(user, storedAccessToken);
    } else {
      onClear();
    }
  });
};

export const getAccessToken = () => {
  return storedAccessToken;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

