import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc as firestoreDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate config
if (!firebaseConfig.apiKey) {
  console.error('ERROR: Firebase API Key is missing. Make sure .env.local file exists with NEXT_PUBLIC_FIREBASE_API_KEY');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Admin user configuration
const ADMIN_USER = {
  displayName: 'Renu Deshmukh',
  email: 'renu.deshmukh@aimlclub.com',
  password: 'Renu@2318',
  role: 'admin' as const,
};

async function seedDatabase() {
  console.log('Seeding database...');
  console.log('Project:', firebaseConfig.projectId);

  try {
    // Create admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_USER.email,
      ADMIN_USER.password
    );

    // Update display name
    await updateProfile(userCredential.user, {
      displayName: ADMIN_USER.displayName,
    });

    // Create admin user document in Firestore
    const userData = {
      uid: userCredential.user.uid,
      email: ADMIN_USER.email,
      displayName: ADMIN_USER.displayName,
      role: ADMIN_USER.role,
      reputationScore: 100,
      profile: {
        bio: 'Platform Administrator',
        expertise: ['AI/ML', 'Leadership', 'Strategy'],
      },
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };

    await setDoc(firestoreDoc(db, 'users', userCredential.user.uid), userData);

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${ADMIN_USER.email}`);
    console.log(`   Password: ${ADMIN_USER.password}`);
    console.log(`   Role: ${ADMIN_USER.role}`);
    console.log('\nYou can now sign in with these credentials.');

  } catch (authError: unknown) {
    const errorCode = (authError as { code?: string })?.code;
    const errorMessage = (authError as { message?: string })?.message;
    
    if (errorCode === 'auth/email-already-in-use') {
      console.log('⚠️  Admin user already exists!');
      console.log('   Email:', ADMIN_USER.email);
      console.log('   Password:', ADMIN_USER.password);
      console.log('\nYou can sign in with these credentials.');
      console.log('If you forgot the password, reset it in Firebase Console.');
    } else if (errorCode === 'auth/operation-not-allowed') {
      console.error('❌ Email/Password authentication is not enabled.');
      console.error('   Please enable it in Firebase Console:');
      console.error('   Authentication → Sign-in method → Email/Password → Enable');
    } else {
      console.error('Error:', errorCode, errorMessage);
      throw authError;
    }
  }

  console.log('\nSeeding complete!');
}

seedDatabase()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });