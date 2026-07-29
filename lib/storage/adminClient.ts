import { createClient } from "@supabase/supabase-js";

// Service-role client — uploads only, never imported from app code that ships
// to the client. Reads go straight through fetch() against the public bucket
// URL instead (see repository.ts), so no key is needed for that path at all.
let client: ReturnType<typeof createClient> | undefined;

export function getStorageAdminClient() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
