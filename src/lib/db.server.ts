// Server-side Supabase client that falls back to the publishable (anon) key
// when SUPABASE_SERVICE_ROLE_KEY is not configured (e.g. Vercel deploys where
// only the .env values ship). Combined with permissive RLS policies on
// `sheet_config` and `reimbursement_cache`, the app keeps working across hosts.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_SUPABASE_URL = "https://vydwqikwwilzgfvownpx.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZHdxaWt3d2lsemdmdm93bnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODEyNzUsImV4cCI6MjA5NzY1NzI3NX0.OTNbJGd5_OqS2qIHmOCpJfxA7E5qMWueiOGzgKM0Zrg";

function readEnv(name: string): string | undefined {
  return process.env[name] || import.meta.env?.[name];
}

function build() {
  const url = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL") || FALLBACK_SUPABASE_URL;
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey =
    readEnv("SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;
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
