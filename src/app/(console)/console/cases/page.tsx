import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { parseCase, statusLabel, dispositionLabel } from "@/lib/cases";
import { SubmitButton } from "@/components/submit-button";
import { LocalTime } from "@/components/local-time";
import { Notice } from "@/components/notice";

export const dynamic = "force-dynamic";

const FIELD =
  "rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3";

// A case is the returned part as the quality desk tracks it. Findings attach to
// it on the case page; the disposition closes it.
async function openCase(formData: FormData) {
  "use server";
  const session = await currentSession();
  if (!session) redirect("/login");
  const parsed = parseCase(formData);
  if (!parsed.ok) redirect(`/console/cases?error=${encodeURIComponent(parsed.error)}`);

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("cases")
    .insert({ tenant_id: session.tenantId, ...parsed.value })
    .select("id")
    .single();
  if (error || !data) {
    const msg = /duplicate|unique/i.test(error?.message ?? "")
      ? "That RMA number already has a case."
      : "The case could not be saved.";
    redirect(`/console/cases?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/console/cases");
  redirect(`/console/cases/${data.id}?saved=opened`);
}

type CaseRow = {
  id: string;
  rma: string;
  customer: string | null;
  part_serial: string | null;
  status: string;
  disposition: string | null;
  created_at: string;
  findings: { count: number }[];
};

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl">Cases</h1>
        <p className="mt-2 text-sm text-c-text-2">Cases run on the Supabase workspace.</p>
      </div>
    );
  }
  const session = await currentSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const sb = await supabaseServer();
  let q = sb
    .from("cases")
    .select("id, rma, customer, part_serial, status, disposition, created_at, findings(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.status === "open" || sp.status === "inspecting" || sp.status === "closed") q = q.eq("status", sp.status);
  const { data, error } = await q;
  const cases = (data ?? []) as CaseRow[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl">Cases</h1>
        <p className="mt-1 text-sm text-c-text-2">
          One case per returned part: its RMA, who sent it back and why, the findings its
          photographs produced, and what the plant decided.
        </p>
      </header>

      {sp.error && <Notice tone="err">{sp.error}</Notice>}
      {error && (
        <Notice tone="err">
          Cases need the cases table. Apply{" "}
          <span className="tabular">supabase/migrations/20260927140000_cases.sql</span>.
        </Notice>
      )}

      <details className="mb-6 rounded-sm border border-c-line bg-c-surface" open={cases.length === 0}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-c-text">Open a case</summary>
        <form action={openCase} className="grid gap-3 border-t border-c-line p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            RMA number *
            <input name="rma" required maxLength={64} placeholder="RMA-24-0117" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Customer
            <input name="customer" maxLength={120} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Part serial
            <input name="part_serial" maxLength={80} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Run hours
            <input name="run_hours" type="number" min={0} step={1} inputMode="numeric" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2 sm:col-span-2">
            Return reason
            <input name="return_reason" maxLength={500} placeholder="Noise at 40 km/h, customer complaint" className={FIELD} />
          </label>
          <div className="sm:col-span-3">
            <SubmitButton pending="Opening…">Open case</SubmitButton>
          </div>
        </form>
      </details>

      <nav aria-label="Filter by status" className="mb-3 flex flex-wrap gap-1 text-2xs">
        {[
          ["", "All"],
          ["open", "Open"],
          ["inspecting", "Inspecting"],
          ["closed", "Closed"],
        ].map(([code, label]) => {
          const active = (sp.status ?? "") === code;
          return (
            <Link
              key={code}
              href={code ? `/console/cases?status=${code}` : "/console/cases"}
              aria-current={active ? "page" : undefined}
              className={`rounded-sm border px-2.5 py-1 ${
                active ? "border-c-text-3 bg-c-surface-2 text-c-text" : "border-c-line text-c-text-2 hover:bg-c-surface-2"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {cases.length === 0 ? (
        <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
          No cases{sp.status ? " with this status" : " yet"}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-c-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-c-surface text-left text-2xs uppercase tracking-wide text-c-text-3">
              <tr>
                <th className="px-3 py-2 font-medium">RMA</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Disposition</th>
                <th className="px-3 py-2 text-right font-medium">Findings</th>
                <th className="px-3 py-2 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t border-c-line transition-colors hover:bg-c-surface-2">
                  <td className="px-3 py-2">
                    <Link
                      href={`/console/cases/${c.id}`}
                      className="tabular text-c-text underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
                    >
                      {c.rma}
                    </Link>
                    {c.part_serial && <span className="ml-2 text-2xs text-c-text-3">{c.part_serial}</span>}
                  </td>
                  <td className="px-3 py-2 text-c-text-2">{c.customer ?? "n/a"}</td>
                  <td className="px-3 py-2 text-c-text-2">{statusLabel(c.status)}</td>
                  <td className="px-3 py-2 text-c-text-2">{dispositionLabel(c.disposition)}</td>
                  <td className="px-3 py-2 text-right tabular">{c.findings?.[0]?.count ?? 0}</td>
                  <td className="px-3 py-2 text-2xs text-c-text-3">
                    <LocalTime iso={c.created_at} date />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
