import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { CASE_STATUSES, DISPOSITIONS, dispositionLabel, parseCase, statusLabel } from "@/lib/cases";
import { modeLabel } from "@/lib/iso";
import { reviewStateLabel } from "@/lib/gate";
import { SubmitButton } from "@/components/submit-button";
import { SeverityChip } from "@/components/severity-chip";
import { LocalTime } from "@/components/local-time";
import { Notice } from "@/components/notice";

export const dynamic = "force-dynamic";

const FIELD =
  "rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Case = {
  id: string;
  rma: string;
  customer: string | null;
  part_serial: string | null;
  run_hours: number | null;
  return_reason: string | null;
  status: string;
  disposition: string | null;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
};

type Linked = {
  id: string;
  iso_standard: string;
  iso_mode: string;
  severity: number;
  review_state: string;
  crop_uri: string | null;
  created_at: string;
};

async function updateCase(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) notFound();
  if (!(await currentSession())) redirect("/login");
  const parsed = parseCase(formData);
  if (!parsed.ok) redirect(`/console/cases/${id}?error=${encodeURIComponent(parsed.error)}`);

  const sb = await supabaseServer();
  const { error } = await sb
    .from("cases")
    .update({
      ...parsed.value,
      closed_at: parsed.value.status === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) redirect(`/console/cases/${id}?error=${encodeURIComponent("The case could not be saved.")}`);
  revalidatePath(`/console/cases/${id}`);
  revalidatePath("/console/cases");
  redirect(`/console/cases/${id}?saved=updated`);
}

// Attach or detach one finding. RLS confines both rows to the caller's tenant,
// so a finding id from another workspace simply matches nothing.
async function linkFinding(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const findingId = String(formData.get("finding_id") ?? "");
  const detach = formData.get("detach") === "1";
  if (!UUID.test(id) || !UUID.test(findingId)) notFound();
  if (!(await currentSession())) redirect("/login");
  const sb = await supabaseServer();
  const { error } = await sb
    .from("findings")
    .update({ case_id: detach ? null : id })
    .eq("id", findingId);
  if (error) redirect(`/console/cases/${id}?error=${encodeURIComponent("The finding could not be linked.")}`);
  revalidatePath(`/console/cases/${id}`);
  redirect(`/console/cases/${id}?saved=${detach ? "detached" : "attached"}`);
}

const SAVED: Record<string, string> = {
  opened: "Case opened. Attach the findings its photographs produced below.",
  updated: "Case saved.",
  attached: "Finding attached.",
  detached: "Finding detached.",
};

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!supabaseConfigured) redirect("/console/cases");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const session = await currentSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const sb = await supabaseServer();
  const [{ data: c }, linkedRes, freeRes] = await Promise.all([
    sb
      .from("cases")
      .select("id, rma, customer, part_serial, run_hours, return_reason, status, disposition, notes, created_at, closed_at")
      .eq("id", id)
      .maybeSingle<Case>(),
    sb
      .from("findings")
      .select("id, iso_standard, iso_mode, severity, review_state, crop_uri, created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    sb
      .from("findings")
      .select("id, iso_standard, iso_mode, severity, created_at")
      .is("case_id", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!c) notFound();
  const linked = (linkedRes.data ?? []) as Linked[];
  const free = (freeRes.data ?? []) as Omit<Linked, "review_state" | "crop_uri">[];
  const worst = linked.reduce((m, f) => Math.max(m, f.severity), -1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="mb-2 text-2xs text-c-text-3">
        <Link href="/console/cases" className="hover:text-c-text">
          Cases
        </Link>{" "}
        / <span className="tabular">{c.rma}</span>
      </p>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tabular text-2xl">{c.rma}</h1>
          <p className="mt-1 text-sm text-c-text-2">
            {statusLabel(c.status)} · {dispositionLabel(c.disposition)} · opened <LocalTime iso={c.created_at} date />
            {c.closed_at && (
              <>
                {" "}
                · closed <LocalTime iso={c.closed_at} date />
              </>
            )}
          </p>
        </div>
        {worst >= 0 && <SeverityChip level={worst} />}
      </header>

      {sp.saved && SAVED[sp.saved] && <Notice tone="ok">{SAVED[sp.saved]}</Notice>}
      {sp.error && <Notice tone="err">{sp.error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-2 text-2xs uppercase tracking-wide text-c-text-3">
            Findings ({linked.length})
          </h2>
          {linked.length === 0 ? (
            <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-6 text-center text-sm text-c-text-3">
              No findings attached yet.
            </p>
          ) : (
            <ul className="divide-y divide-c-line overflow-hidden rounded-sm border border-c-line bg-c-surface">
              {linked.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                  {f.crop_uri ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored data URI thumbnail
                    <img src={f.crop_uri} alt="" className="h-10 w-10 shrink-0 rounded-sm border border-c-line object-cover" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-sm border border-dashed border-c-line" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/console/findings/${f.id}`}
                      className="text-sm text-c-text underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
                    >
                      <span className="tabular text-c-text-3">{f.iso_mode}</span> {modeLabel(f.iso_standard, f.iso_mode)}
                    </Link>
                    <p className="text-2xs text-c-text-3">
                      {reviewStateLabel(f.review_state)} · <LocalTime iso={f.created_at} date />
                    </p>
                  </div>
                  <SeverityChip level={f.severity} />
                  <form action={linkFinding}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="finding_id" value={f.id} />
                    <input type="hidden" name="detach" value="1" />
                    <button
                      type="submit"
                      className="rounded-sm px-2 py-1 text-2xs text-c-text-3 hover:bg-c-surface-2 hover:text-c-text"
                      aria-label={`Detach finding ${f.iso_mode}`}
                    >
                      Detach
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={linkFinding} className="mt-3 flex flex-wrap items-end gap-2 rounded-sm border border-c-line bg-c-surface p-3">
            <input type="hidden" name="id" value={c.id} />
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-2xs text-c-text-2">
              Attach a finding
              <select name="finding_id" required className={FIELD} disabled={free.length === 0}>
                {free.length === 0 ? (
                  <option value="">Every recent finding already belongs to a case</option>
                ) : (
                  free.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.iso_mode} · {modeLabel(f.iso_standard, f.iso_mode)} · sev {f.severity} ·{" "}
                      {f.created_at.slice(0, 10)}
                    </option>
                  ))
                )}
              </select>
            </label>
            {free.length > 0 && (
              <SubmitButton pending="Attaching…" size="sm">
                Attach
              </SubmitButton>
            )}
          </form>
        </section>

        <form action={updateCase} className="space-y-3 rounded-sm border border-c-line bg-c-surface p-4">
          <input type="hidden" name="id" value={c.id} />
          <h2 className="text-2xs uppercase tracking-wide text-c-text-3">Case record</h2>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            RMA number
            <input name="rma" required maxLength={64} defaultValue={c.rma} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Customer
            <input name="customer" maxLength={120} defaultValue={c.customer ?? ""} className={FIELD} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-2xs text-c-text-2">
              Part serial
              <input name="part_serial" maxLength={80} defaultValue={c.part_serial ?? ""} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-2xs text-c-text-2">
              Run hours
              <input
                name="run_hours"
                type="number"
                min={0}
                step={1}
                defaultValue={c.run_hours ?? ""}
                className={FIELD}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Return reason
            <input name="return_reason" maxLength={500} defaultValue={c.return_reason ?? ""} className={FIELD} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-2xs text-c-text-2">
              Status
              <select name="status" defaultValue={c.status} className={FIELD}>
                {CASE_STATUSES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-2xs text-c-text-2">
              Disposition
              <select name="disposition" defaultValue={c.disposition ?? ""} className={FIELD}>
                <option value="">Undecided</option>
                {DISPOSITIONS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Notes
            <textarea name="notes" rows={4} maxLength={2000} defaultValue={c.notes ?? ""} className={FIELD} />
          </label>
          <p className="text-2xs text-c-text-3">Closing needs a disposition.</p>
          <SubmitButton pending="Saving…">Save case</SubmitButton>
        </form>
      </div>
    </div>
  );
}
