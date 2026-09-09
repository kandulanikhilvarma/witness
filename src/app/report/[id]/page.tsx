import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import { attributionFor, familyForStandard, modeLabel, severity as sevMeta } from "@/lib/iso";
import { findingDetail } from "@/lib/fleet";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

// A print-ready warranty / inspection report for one finding. Deliberately
// outside the console rail and on white paper — the browser's Save-as-PDF turns
// it into the document a warranty claim attaches. The ISO clause and the
// inspector's authoritative call are what a supplier disputes against.
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured) redirect("/console");
  const session = await currentSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const f = await findingDetail(id);
  if (!f) notFound();

  const sm = sevMeta(f.severity);
  const family = familyForStandard(f.iso_standard);
  const attr = attributionFor(f.attribution);
  const reviewed = f.review_state === "confirmed" || f.review_state === "corrected";

  return (
    <main
      className="mx-auto max-w-[800px] bg-white px-10 py-10 text-[#111] print:px-0 print:py-0"
      style={{ minHeight: "100vh" }}
    >
      <div className="mb-6 flex items-start justify-between border-b-2 border-[#111] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Witness</h1>
          <p className="text-xs text-[#555]">Inspection &amp; warranty report</p>
        </div>
        <div className="text-right text-xs text-[#555]">
          <div>{session.tenantName}</div>
          <div>{new Date().toLocaleDateString()}</div>
          <div className="font-mono">#{f.id.slice(0, 8)}</div>
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6">
        <div>
          {f.crop_uri ? (
            <Image src={f.crop_uri} alt="subject" width={200} height={200} unoptimized className="w-full border border-[#ccc] object-cover" />
          ) : (
            <div className="aspect-square border border-dashed border-[#ccc]" />
          )}
        </div>
        <div>
          <table className="w-full text-sm">
            <tbody>
              <Line k="Standard" v={`${f.iso_standard} (${family})`} />
              <Line k="Clause" v={f.iso_clause ?? f.iso_mode} />
              <Line k="Failure mode" v={`${f.iso_mode} — ${modeLabel(f.iso_standard, f.iso_mode)}`} />
              <Line k="Severity" v={`${f.severity} · ${sm.label} — ${sm.action}`} />
              <Line k="Attribution" v={attr ? attr.label : "Unattributed"} />
              <Line k="Confidence" v={f.confidence != null ? f.confidence.toFixed(2) : "—"} />
              <Line k="Anomaly score" v={f.anomaly_score != null ? `${f.anomaly_score.toFixed(2)}×` : "—"} />
              <Line k="Batch" v={f.batches.map((b) => `${b.batch_code}${b.supplier ? ` (${b.supplier})` : ""}`).join(", ") || "—"} />
              <Line k="Model" v={f.model_version ?? "—"} />
              <Line k="Recorded" v={new Date(f.created_at).toLocaleString()} />
              <Line k="Status" v={reviewed ? `Inspector ${f.review_state}` : `Not yet reviewed (${f.review_state})`} />
            </tbody>
          </table>
        </div>
      </div>

      {f.evidence_text && (
        <section className="mt-6">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#555]">Evidence</h2>
          <p className="text-sm">{f.evidence_text}</p>
        </section>
      )}

      <section className="mt-8 border-t border-[#ccc] pt-4 text-xs text-[#555]">
        <p>
          Classification follows {f.iso_standard}
          {family === "bearing" ? " (rolling bearing damage)" : " (gear tooth damage)"}. The
          inspector&apos;s review is the authoritative determination; the model output is a
          suggestion retained for provenance. This report is generated from the workspace of
          record and reflects its state at the time above.
        </p>
        <div className="mt-8 flex justify-between">
          <div className="border-t border-[#111] pt-1 text-[#111]" style={{ width: "45%" }}>
            Inspector signature
          </div>
          <div className="border-t border-[#111] pt-1 text-[#111]" style={{ width: "45%" }}>
            Date
          </div>
        </div>
      </section>

      <div className="mt-8 print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-[#eee]">
      <td className="w-32 py-1.5 pr-3 align-top text-xs uppercase tracking-wide text-[#888]">{k}</td>
      <td className="py-1.5 align-top">{v}</td>
    </tr>
  );
}
