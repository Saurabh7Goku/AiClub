import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './client';
import { User, UserRole, UserFirestore } from '@/types';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: Timestamp | { seconds: number; nanoseconds: number } | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return new Date(timestamp.seconds * 1000);
};

// Remove undefined values from an object
const removeUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = removeUndefined(value as Record<string, unknown>);
        if (Object.keys(nested).length > 0) {
          cleaned[key] = nested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// Create user document in Firestore
export const createUserDocument = async (
  firebaseUser: FirebaseUser,
  additionalData?: { displayName?: string; role?: UserRole }
): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const { email, displayName, uid } = firebaseUser;
    const userData = removeUndefined({
      uid,
      email: email || '',
      displayName: displayName || additionalData?.displayName || 'Anonymous User',
      role: additionalData?.role || 'member',
      reputationScore: 0,
      profile: {
        bio: '',
        expertise: [],
      },
      digestSubscription: false,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    });

    await setDoc(userRef, userData);

    return {
      ...userData,
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || additionalData?.displayName || 'Anonymous User',
      role: (additionalData?.role || 'member') as UserRole,
      reputationScore: 0,
      joinedClubs: [],
      digestSubscription: false,
      createdAt: new Date(),
      lastActive: new Date(),
      profile: {
        bio: '',
        expertise: [],
      },
    } as User;
  }

  const existingData = userSnap.data() as UserFirestore;
  return {
    ...existingData,
    createdAt: convertTimestamp(existingData.createdAt),
    lastActive: convertTimestamp(existingData.lastActive),
  };
};

// Get user from Firestore
export const getUserFromFirestore = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data() as UserFirestore;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    lastActive: convertTimestamp(data.lastActive),
  };
};

// Sign up with email and password
export const signUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User; error: string | null }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update Firebase Auth profile
    await updateProfile(userCredential.user, { displayName });

    // Create user document in Firestore
    const user = await createUserDocument(userCredential.user, { displayName });

    return { user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up';
    return { user: null as unknown as User, error: errorMessage };
  }
};

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User; error: string | null }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Get user from Firestore
    let user = await getUserFromFirestore(userCredential.user.uid);

    if (!user) {
      user = await createUserDocument(userCredential.user);
    }

    // Update last active
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });

    return { user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in';
    return { user: null as unknown as User, error: errorMessage };
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{ user: User; error: string | null }> => {
  const trySignIn = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    let user = await getUserFromFirestore(userCredential.user.uid);
    if (!user) user = await createUserDocument(userCredential.user);
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
    return user;
  };

  try {
    const user = await trySignIn();
    return { user, error: null };
  } catch (error) {
    // Firebase internal assertion error from stale popup promise (HMR/page reload)
    // Retry once automatically
    if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
      try {
        const user = await trySignIn();
        return { user, error: null };
      } catch (retryError) {
        const msg = retryError instanceof Error ? retryError.message : 'Google sign in failed. Please try again.';
        return { user: null as unknown as User, error: msg };
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during Google sign in';
    return { user: null as unknown as User, error: errorMessage };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign out';
    return { error: errorMessage };
  }
};

// Send Password Reset Email
export const resetPassword = async (email: string): Promise<{ error: string | null }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending the reset link';
    return { error: errorMessage };
  }
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (
  callback: (user: User | null, loading: boolean) => void
): (() => void) => {
  let unsubscribeFirestore: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    // Clean up previous Firestore listener if any
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }

    if (firebaseUser) {
      const userRef = doc(db, 'users', firebaseUser.uid);

      // Set up real-time listener for the user document
      unsubscribeFirestore = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserFirestore;
          const user: User = {
            ...data,
            uid: snapshot.id,
            createdAt: convertTimestamp(data.createdAt),
            lastActive: convertTimestamp(data.lastActive),
          };
          callback(user, false);
        } else {
          // Document doesn't exist yet, might be in transition
          callback(null, false);
        }
      }, (error) => {
        console.error('Firestore user subscription error:', error);
        callback(null, false);
      });
    } else {
      callback(null, false);
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Get ID token for API calls
export const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};
