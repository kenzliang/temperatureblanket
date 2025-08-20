import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_KEY!; // for server-side upserts

export const supaAnon = createClient(url, anon, { auth: { persistSession: false } });
export const supaService = createClient(url, service, { auth: { persistSession: false } });