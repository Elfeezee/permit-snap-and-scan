import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://schnrrroqneonpudbybf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaG5ycnJvcW5lb25wdWRieWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTM1MzIsImV4cCI6MjA3ODE4OTUzMn0.6vGgVOkkBAukAeZA0lgzTfqCWcK0xGFszZQSBfR8kcA';

export const activeSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});