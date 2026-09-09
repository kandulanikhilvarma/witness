import { supabaseServer } from "./supabase/server";

export interface Session {
  userId: string;
  tenantId: string;
  tenantName: string;
}

// Resolve the signed-in user's workspace, creating one on first sign-in. RLS
// lets a user read only their own memberships and only tenants they belong to,
// so this is safe to call for any authenticated request. Returns null when
// there is no session — the caller sends them to /login.
export async function currentSession(): Promise<Session | null> {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: memberships } = await sb
    .from("memberships")
    .select("tenant_id, tenants(name)")
    .limit(1);

  const existing = memberships?.[0] as
    | { tenant_id: string; tenants: { name: string } | null }
    | undefined;
  if (existing) {
    return {
      userId: user.id,
      tenantId: existing.tenant_id,
      tenantName: existing.tenants?.name ?? "Workspace",
    };
  }

  // Bootstrap: first sign-in gets a workspace and a membership in it. Done in a
  // SECURITY DEFINER function so both rows land atomically — a fresh tenant has
  // no membership yet, so a plain insert+return would trip the tenant RLS.
  const name = user.email ? `${user.email.split("@")[0]}'s workspace` : "Demo workspace";
  const { data: tenant, error: te } = await sb
    .rpc("bootstrap_tenant", { p_name: name })
    .single<{ id: string; name: string }>();
  if (te || !tenant) return null;

  return { userId: user.id, tenantId: tenant.id, tenantName: tenant.name };
}
