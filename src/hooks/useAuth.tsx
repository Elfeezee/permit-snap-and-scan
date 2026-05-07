import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

const ACTIVE_BACKEND_URL = 'https://schnrrroqneonpudbybf.supabase.co';
const ACTIVE_BACKEND_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaG5ycnJvcW5lb25wdWRieWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTM1MzIsImV4cCI6MjA3ODE4OTUzMn0.6vGgVOkkBAukAeZA0lgzTfqCWcK0xGFszZQSBfR8kcA';
const configuredBackendUrl = import.meta.env.VITE_SUPABASE_URL ?? ACTIVE_BACKEND_URL;
const configuredBackendKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ACTIVE_BACKEND_KEY;
const authClient = createClient(configuredBackendUrl, configuredBackendKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

const normalizeAuthError = (error: any) => {
  if (error?.message === 'Failed to fetch') {
    return {
      ...error,
      message:
        'The registration request could not reach the authentication service. Please disable browser ad/privacy extensions for this site and try again.',
    };
  }

  return error;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = authClient.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    authClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await authClient.auth.signInWithPassword({
        email,
        password,
      });
      return { error: normalizeAuthError(error) };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/`;

    try {
      const { error } = await authClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData,
        },
      });
      return { error: normalizeAuthError(error) };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signOut = async () => {
    await authClient.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}