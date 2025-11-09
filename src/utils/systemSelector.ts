// System selector utility to switch between Supabase and Firebase
export type BackendSystem = 'supabase' | 'firebase';
export type StorageSystem = 'supabase' | 'firebase' | 'googledrive';

// For now, default to Supabase for database
export const CURRENT_SYSTEM: BackendSystem = 'supabase';

// Use Supabase storage buckets for file storage
export const CURRENT_STORAGE: StorageSystem = 'supabase';

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

export function isUsingGoogleDrive(): boolean {
  return CURRENT_STORAGE === 'googledrive';
}