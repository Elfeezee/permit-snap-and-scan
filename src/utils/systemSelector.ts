// System selector utility to switch between Supabase and Firebase
export type BackendSystem = 'supabase' | 'firebase';

// For now, default to Supabase. Later you can switch this or use environment variables
export const CURRENT_SYSTEM: BackendSystem = 'firebase';

// You can also create environment-based switching:
// export const CURRENT_SYSTEM: BackendSystem = 
//   (import.meta.env.VITE_BACKEND_SYSTEM as BackendSystem) || 'supabase';

export function useCurrentSystem(): BackendSystem {
  return CURRENT_SYSTEM;
}

// Helper function to determine which service to use
export function isUsingFirebase(): boolean {
  return CURRENT_SYSTEM === 'firebase';
}

export function isUsingSupabase(): boolean {
  return CURRENT_SYSTEM === 'supabase';
}