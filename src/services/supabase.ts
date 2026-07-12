import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ezcqewagqviyoupnftb.supabase.co'.trim();
const supabaseAnonKey = 'sb_publishable_4lbRBl9eGH2g1nNVLVHP-A_e7KbHS6Y'.trim();

// Debug logging to verify credentials are loaded
console.log('Supabase URL length:', supabaseUrl.length);
console.log('Supabase Anon Key length:', supabaseAnonKey.length);
console.log('Supabase URL defined:', !!supabaseUrl);
console.log('Supabase Anon Key defined:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetch,
  },
});

export const schedulesTable = 'schedules';
