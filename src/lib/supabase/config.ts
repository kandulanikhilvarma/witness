// Witness uses Supabase only when both public env vars are present. Absent —
// local dev, or a deploy whose secrets aren't set yet — the app falls back to
// in-process PGlite (src/lib/db.ts). One flag decides which path every caller
// takes, so neither half half-runs.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Witness tables live in a dedicated `witness` Postgres schema, isolated from
// anything else in the host project. The schema must be added to the project's
// exposed schemas (Supabase → API settings) for PostgREST to reach it.
export const WITNESS_SCHEMA = "witness";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
