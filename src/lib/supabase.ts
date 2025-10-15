import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface TrainingSample {
  id: string;
  sample_type: 'query' | 'sigma_rule' | 'log_snippet';
  content: string;
  description?: string;
  created_at: string;
  updated_at: string;
  session_id?: string;
}
