import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, WITNESS_SCHEMA } from "./config";

// Request-scoped Supabase client. Reads the auth session from cookies so RLS
// runs as the signed-in user — every query is already tenant-fenced by the
// policies in the witness schema. Bound to the witness schema so table names
// are unqualified.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: WITNESS_SCHEMA },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component render — the middleware refreshes
          // the session cookie instead. Safe to ignore here.
        }
      },
    },
  });
}
