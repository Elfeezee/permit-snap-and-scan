import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUf7xm5YVE2acm4N2AEy7AWoV4N8qEjuk",
  authDomain: "kasupda-backend.firebaseapp.com",
  projectId: "kasupda-backend",
  storageBucket: "kasupda-backend.firebasestorage.app",
  messagingSenderId: "185975290310",
  appId: "1:185975290310:web:852092bdd064bbf83e1ac7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;