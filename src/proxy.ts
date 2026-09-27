import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

// Refresh the Supabase auth cookie so Server Components see a live session.
// No-op when Supabase isn't configured (PGlite fallback). Next 16 calls this
// file "proxy" (formerly middleware).
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next();

  const response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Only the signed-in surfaces. The marketing pages never read a session, so
  // they should not pay an auth round trip on every view. API routes manage
  // their own auth.
  matcher: ["/console/:path*", "/login", "/report/:path*"],
};
