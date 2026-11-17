'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured = Boolean(url && key && !url.includes('your-project') && !key.includes('replace_me'));
export const supabase = isSupabaseConfigured ? createClient(url!, key!, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null;
