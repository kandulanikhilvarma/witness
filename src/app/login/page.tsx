"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

// Phase 1 auth. Anonymous sign-in is the one-click demo path; email magic-link
// is offered for a named workspace. Both resolve to a tenant on first console
// load (see src/lib/tenant.ts).
export default function Login() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-md px-8 py-24 text-paper">
        <h1 className="font-display text-2xl">Sign-in unavailable</h1>
        <p className="mt-3 text-sm text-paper-2">
          Supabase is not configured for this deployment, so the console runs on
          the local demo database and needs no sign-in. Open{" "}
          <a href="/console" className="text-oxide underline">the console</a> directly.
        </p>
      </div>
    );
  }

  async function demo() {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInAnonymously();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/console");
    router.refresh();
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/console` },
    });
    if (error) setError(error.message);
    else setMsg("Check your email for the sign-in link.");
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-8 py-24 text-paper">
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">Witness console</p>
      <h1 className="mt-3 font-display text-3xl">Sign in</h1>

      <button
        onClick={demo}
        disabled={busy}
        className="mt-8 rounded-sm bg-oxide px-6 py-3 text-base font-medium text-on-accent transition-colors hover:bg-oxide-deep disabled:opacity-50"
      >
        {busy ? "Opening…" : "Enter the demo workspace"}
      </button>
      <p className="mt-2 text-2xs text-iron">
        Anonymous session — a private workspace, no email required.
      </p>

      <form onSubmit={magic} className="mt-10 flex flex-col gap-3 border-t border-iron/20 pt-8">
        <label className="text-2xs uppercase tracking-wide text-paper-2">
          Or sign in by email
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@plant.com"
            className="flex-1 rounded-sm border border-iron/30 bg-ground-2 px-3 py-2 text-sm text-paper placeholder:text-iron"
          />
          <button
            type="submit"
            disabled={busy || !email}
            className="rounded-sm border border-iron/40 px-4 py-2 text-sm text-paper-2 hover:border-brass hover:text-paper disabled:opacity-50"
          >
            Send link
          </button>
        </div>
      </form>

      {msg && <p className="mt-4 text-2xs text-verdigris">{msg}</p>}
      {error && <p className="mt-4 text-2xs text-oxide" role="alert">{error}</p>}
    </div>
  );
}
