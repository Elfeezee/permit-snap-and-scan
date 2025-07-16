import React, { ReactNode } from 'react';
import { AuthProvider as SupabaseAuthProvider, useAuth } from './useAuth';
import { FirebaseAuthProvider, useFirebaseAuth } from './useFirebaseAuth';
import { isUsingFirebase } from '@/utils/systemSelector';

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export function UnifiedAuthProvider({ children }: UnifiedAuthProviderProps) {
  if (isUsingFirebase()) {
    return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
  } else {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
  }
}

// Unified hook that returns the appropriate auth context
export function useUnifiedAuth() {
  if (isUsingFirebase()) {
    const firebaseAuth = useFirebaseAuth();
    return {
      user: firebaseAuth.user ? {
        ...firebaseAuth.user,
        id: firebaseAuth.user.uid // Add id property for consistency
      } : null,
      session: null, // Firebase doesn't have sessions like Supabase
      loading: firebaseAuth.loading,
      signIn: firebaseAuth.signIn,
      signUp: firebaseAuth.signUp,
      signOut: firebaseAuth.signOut,
      profile: firebaseAuth.profile,
      isAdmin: firebaseAuth.isAdmin
    };
  } else {
    const supabaseAuth = useAuth();
    return {
      user: supabaseAuth.user,
      session: supabaseAuth.session,
      loading: supabaseAuth.loading,
      signIn: supabaseAuth.signIn,
      signUp: supabaseAuth.signUp,
      signOut: supabaseAuth.signOut,
      profile: null, // Supabase auth doesn't have built-in profiles in this setup
      isAdmin: false // You'd need to implement admin check for Supabase
    };
  }
}