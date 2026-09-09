"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOut() {
  const router = useRouter();
  async function out() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={out}
      className="text-2xs text-c-text-3 underline decoration-c-line underline-offset-2 hover:text-c-text"
    >
      Sign out
    </button>
  );
}
