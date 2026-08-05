import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Secret-key client — server-side table/Storage writes that need to bypass
// RLS (route handlers, publish/ingestion scripts), never imported from app
// code that ships to the client. Storage reads still go straight through
// fetch() against the public bucket URL instead (see repository.ts), so no
// key is needed for that path at all. ("Secret key" is Supabase's current
// name for the old "service_role key" — same role, bypasses every RLS
// policy, still never allowed near a client bundle.)
//
// Typed against Database (database.types.ts) — createClient() with no
// generic collapses every table's insert/update payload to `never` (a real
// supabase-js quirk with the default Database = any), so this is required,
// not just nice-to-have type safety.
let client: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAdminClient() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
    client = createClient<Database>(url, key, { auth: { persistSession: false } });
  }
  return client;
}
