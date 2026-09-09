import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

// Refresh the Supabase auth cookie on each request so Server Components see a
// live session. No-op when Supabase isn't configured (PGlite fallback).
export async function middleware(request: NextRequest) {
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
  // Everything except static assets and the API (routes manage their own auth).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
