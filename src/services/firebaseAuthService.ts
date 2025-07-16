import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/config';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt: any;
  updatedAt: any;
}

export class FirebaseAuthService {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ error: any }> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Sign up with email and password
  async signUp(
    email: string, 
    password: string, 
    userData?: { displayName?: string; role?: 'user' | 'admin' }
  ): Promise<{ error: any }> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Update user profile if displayName provided
      if (userData?.displayName) {
        await updateProfile(user, { displayName: userData.displayName });
      }

      // Create user profile document in Firestore
      const profileData: FirebaseUserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: userData?.displayName || null,
        photoURL: user.photoURL || null,
        role: userData?.role || 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'profiles', user.uid), profileData);

      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  // Send password reset email
  async resetPassword(email: string): Promise<{ error: any }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<{ data: FirebaseUserProfile | null; error: any }> {
    try {
      const docRef = doc(db, 'profiles', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { data: docSnap.data() as FirebaseUserProfile, error: null };
      } else {
        return { data: null, error: 'Profile not found' };
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  // Update user profile
  async updateUserProfile(
    uid: string, 
    updates: Partial<FirebaseUserProfile>
  ): Promise<{ error: any }> {
    try {
      const docRef = doc(db, 'profiles', uid);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Auth state listener
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Check if user is admin
  async isAdmin(uid: string): Promise<boolean> {
    try {
      const { data } = await this.getUserProfile(uid);
      return data?.role === 'admin';
    } catch (error) {
      return false;
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();