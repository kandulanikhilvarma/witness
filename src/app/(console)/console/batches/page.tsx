import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { listBatches } from "@/lib/db";
import { SeverityChip } from "@/components/severity-chip";
import { BatchForm } from "@/components/batch-form";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import { createBatch, listBatchStats } from "@/lib/fleet";

export const dynamic = "force-dynamic";

async function addBatch(formData: FormData) {
  "use server";
  const batch_code = String(formData.get("batch_code") ?? "").trim();
  if (!batch_code) return;
  const unit = Number(formData.get("unit_count"));
  await createBatch({
    batch_code,
    plant: String(formData.get("plant") ?? "").trim() || null,
    supplier: String(formData.get("supplier") ?? "").trim() || null,
    produced_at: String(formData.get("produced_at") ?? "").trim() || null,
    unit_count: Number.isFinite(unit) && unit > 0 ? unit : null,
  });
  revalidatePath("/console/batches");
}

export default async function BatchesPage() {
  if (supabaseConfigured) return <SupabaseBatches />;
  const batches = await listBatches();

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Batches</h1>
        <p className="mt-1 text-sm text-c-text-2">
          Production batches and their worst observed severity. Records tag a
          batch on ingest; add provenance below.
        </p>
      </header>

      <BatchForm mode="create" />

      {batches.length === 0 ? (
        <p className="mt-8 rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
          No batches yet.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-sm border border-c-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-c-surface text-left text-2xs uppercase tracking-wide text-c-text-3">
              <tr>
                <th className="px-3 py-2 font-medium">Batch</th>
                <th className="px-3 py-2 font-medium">Part</th>
                <th className="px-3 py-2 font-medium">Produced</th>
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Parts</th>
                <th className="px-3 py-2 font-medium">Worst severity</th>
                <th className="px-3 py-2 font-medium">Last inspected</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.code} className="border-t border-c-line">
                  <td className="px-3 py-2">
                    <Link
                      href={`/console/batches/${encodeURIComponent(b.code)}`}
                      className="tabular text-c-text underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
                    >
                      {b.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize text-c-text-2">
                    {b.partFamily ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular text-c-text-2">
                    {b.producedOn ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-c-text-2">{b.line ?? "—"}</td>
                  <td className="px-3 py-2 tabular text-c-text-2">{b.parts}</td>
                  <td className="px-3 py-2">
                    {b.parts > 0 ? <SeverityChip level={b.worstSeverity} /> : "—"}
                  </td>
                  <td className="px-3 py-2 tabular text-2xs text-c-text-3">
                    {b.lastSeen ? new Date(b.lastSeen).toLocaleString() : "—"}
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

const SEV_TEXT = ["text-sev-0", "text-sev-1", "text-sev-2", "text-sev-3", "text-sev-4"];

async function SupabaseBatches() {
  if (!(await currentSession())) redirect("/login");
  const batches = await listBatchStats();

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Batches &amp; suppliers</h1>
        <p className="mt-1 text-sm text-c-text-2">
          Production lots and the findings linked to them. A bad supplier lot
          shows up as a cluster of severe findings against one batch.
        </p>
      </header>

      <form
        action={addBatch}
        className="mb-6 grid gap-2 rounded-sm border border-c-line bg-c-surface p-4 sm:grid-cols-5"
      >
        <input name="batch_code" required placeholder="Batch code" className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3" />
        <input name="supplier" placeholder="Supplier" className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3" />
        <input name="plant" placeholder="Plant" className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3" />
        <input name="produced_at" type="date" className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text" />
        <button className="rounded-sm bg-c-focus px-3 py-1.5 text-sm font-medium text-paper">Add batch</button>
      </form>

      {batches.length === 0 ? (
        <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
          No batches yet. Add one above, then link findings to it from a finding&apos;s page.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-c-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-c-surface text-left text-2xs uppercase tracking-wide text-c-text-3">
              <tr>
                <th className="px-3 py-2 font-medium">Batch</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">Plant</th>
                <th className="px-3 py-2 font-medium">Produced</th>
                <th className="px-3 py-2 font-medium">Units</th>
                <th className="px-3 py-2 font-medium">Findings</th>
                <th className="px-3 py-2 font-medium">Worst</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t border-c-line">
                  <td className="px-3 py-2 tabular text-c-text">{b.batch_code}</td>
                  <td className="px-3 py-2 text-c-text-2">{b.supplier ?? "—"}</td>
                  <td className="px-3 py-2 text-c-text-2">{b.plant ?? "—"}</td>
                  <td className="px-3 py-2 tabular text-c-text-2">{b.produced_at ?? "—"}</td>
                  <td className="px-3 py-2 tabular text-c-text-2">{b.unit_count ?? "—"}</td>
                  <td className="px-3 py-2 tabular text-c-text">{b.findings}</td>
                  <td className="px-3 py-2">
                    {b.findings > 0 ? (
                      <span className={`tabular ${SEV_TEXT[b.worst]}`}>sev {b.worst}</span>
                    ) : (
                      "—"
                    )}
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
