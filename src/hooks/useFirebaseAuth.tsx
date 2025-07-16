import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { firebaseAuthService, FirebaseUserProfile } from '@/services/firebaseAuthService';

interface FirebaseAuthContextType {
  user: User | null;
  profile: FirebaseUserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: { displayName?: string; role?: 'user' | 'admin' }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<FirebaseUserProfile>) => Promise<{ error: any }>;
  isAdmin: boolean;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirebaseUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user profile from Firestore
        const { data } = await firebaseAuthService.getUserProfile(user.uid);
        setProfile(data);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    return firebaseAuthService.signIn(email, password);
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData?: { displayName?: string; role?: 'user' | 'admin' }
  ) => {
    return firebaseAuthService.signUp(email, password, userData);
  };

  const signOut = async () => {
    await firebaseAuthService.signOut();
  };

  const resetPassword = async (email: string) => {
    return firebaseAuthService.resetPassword(email);
  };

  const updateProfile = async (updates: Partial<FirebaseUserProfile>) => {
    if (!user) return { error: 'No user logged in' };
    
    const result = await firebaseAuthService.updateUserProfile(user.uid, updates);
    
    if (!result.error) {
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    
    return result;
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <FirebaseAuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      isAdmin
    }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}