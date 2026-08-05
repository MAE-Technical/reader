import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Publishable-key client — used only for the actual Supabase Auth calls
// (signUp, signInWithPassword, signOut, getUser-token-validation).
// Least-privilege: this is exactly what the publishable key (Supabase's
// current name for the old "anon" key) is for, so the secret-key client
// (adminClient.ts) stays reserved for RLS-bypassing table writes, never
// routine auth calls.
let client: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAuthClient() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
    client = createClient<Database>(url, key, { auth: { persistSession: false } });
  }
  return client;
}
