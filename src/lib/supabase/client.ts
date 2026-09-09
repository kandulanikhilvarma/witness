"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, WITNESS_SCHEMA } from "./config";

// Browser client, for the sign-in flow. Same witness-schema binding.
export function supabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: WITNESS_SCHEMA },
  });
}
