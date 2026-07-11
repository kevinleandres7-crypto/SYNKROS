import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ezcqewagqviyoupnftb.supabase.co';
const supabaseAnonKey = 'sb_publishable_4lbRBl9eGH2g1nNVLVHP-A_e7KbHS6Y';

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
