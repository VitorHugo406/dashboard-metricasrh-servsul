// Server-side Supabase client that falls back to the publishable (anon) key
// when SUPABASE_SERVICE_ROLE_KEY is not configured (e.g. Vercel deploys where
// only the .env values ship). Combined with permissive RLS policies on
// `sheet_config` and `reimbursement_cache`, the app keeps working across hosts.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function build() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const key = serviceKey || publishableKey;
  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars on server (need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PUBLISHABLE_KEY).`,
    );
  }
  const isOpaque = key.startsWith("sb_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: isOpaque
      ? {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        }
      : undefined,
  });
}

let _client: ReturnType<typeof build> | undefined;

export const db = new Proxy({} as ReturnType<typeof build>, {
  get(_t, prop, receiver) {
    if (!_client) _client = build();
    return Reflect.get(_client, prop, receiver);
  },
});
