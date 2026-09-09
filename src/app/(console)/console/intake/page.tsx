import Image from "next/image";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { IntakeForm } from "@/components/intake-form";
import { provenanceBand } from "@/lib/provenance";

export const dynamic = "force-dynamic";

type ProvReason = { label: string; points: number; won: boolean };
type Asset = {
  id: string;
  image_name: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  thumb: string | null;
  exif: Record<string, unknown> | null;
  phash: string | null;
  provenance_score: number;
  provenance_reasons: ProvReason[] | null;
  source_channel: string | null;
  near_dupe_of: string | null;
  dupe_distance: number | null;
  created_at: string;
};

export default async function IntakePage() {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-8 text-c-text">
        <h1 className="font-display text-2xl">Intake</h1>
        <p className="mt-2 text-sm text-c-text-2">
          Supabase intake is inactive on this deployment. The demo console runs
          on the local database.
        </p>
      </div>
    );
  }
  const session = await currentSession();
  if (!session) redirect("/login");

  const sb = await supabaseServer();
  const { data } = await sb
    .from("assets")
    .select(
      "id, image_name, mime, width, height, thumb, exif, phash, provenance_score, provenance_reasons, source_channel, near_dupe_of, dupe_distance, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  const assets = (data ?? []) as Asset[];

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Intake</h1>
        <p className="mt-1 text-sm text-c-text-2">
          A photo becomes an asset — EXIF read, provenance scored, and hashed
          against your other photos to catch a re-sent duplicate. Classification
          comes later in the pipeline.
        </p>
      </header>

      <IntakeForm />

      <div className="mt-8 space-y-4">
        {assets.length === 0 ? (
          <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
            No photos yet. Upload one above.
          </p>
        ) : (
          assets.map((a) => <AssetCard key={a.id} a={a} />)
        )}
      </div>
    </div>
  );
}

function AssetCard({ a }: { a: Asset }) {
  const band = provenanceBand(a.provenance_score);
  const bandColor =
    band === "high" ? "text-sev-0" : band === "medium" ? "text-sev-1" : "text-sev-3";
  const exifRows = a.exif
    ? Object.entries(a.exif)
        .filter(([, v]) => v != null && typeof v !== "object")
        .slice(0, 12)
    : [];

  return (
    <div className="grid gap-5 rounded-sm border border-c-line bg-c-surface p-4 md:grid-cols-[160px_1fr]">
      <div>
        {a.thumb ? (
          <Image
            src={a.thumb}
            alt={a.image_name ?? "asset"}
            width={160}
            height={160}
            unoptimized
            className="w-full rounded-sm border border-c-line object-cover"
          />
        ) : (
          <div className="aspect-square rounded-sm border border-dashed border-c-line" />
        )}
        <div className="mt-2 text-2xs text-c-text-3">
          {a.width}×{a.height} · {a.source_channel}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm text-c-text">{a.image_name}</span>
          <span className={`font-mono text-sm ${bandColor}`}>
            provenance {a.provenance_score}/100 · {band}
          </span>
        </div>

        {a.near_dupe_of && (
          <p className="mt-2 rounded-sm border border-sev-2/40 bg-sev-2-bg px-3 py-2 text-2xs text-sev-2">
            Near-duplicate — {a.dupe_distance} bits from an earlier photo in this
            workspace. Counted once; not fresh evidence.
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-2xs">
          {a.provenance_reasons?.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2">
              <span className={r.won ? "text-c-text-2" : "text-c-text-3 line-through"}>
                {r.label}
              </span>
              <span className={`tabular ${r.won ? "text-c-text" : "text-c-text-3"}`}>
                {r.won ? `+${r.points}` : "0"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 text-2xs text-c-text-3">
          <span className="tabular">pHash {a.phash}</span>
        </div>

        {exifRows.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-2xs text-c-text-3">EXIF ({exifRows.length})</summary>
            <div className="mt-1 overflow-x-auto rounded-sm border border-c-line">
              <table className="w-full border-collapse text-2xs">
                <tbody>
                  {exifRows.map(([k, v]) => (
                    <tr key={k} className="border-t border-c-line first:border-t-0">
                      <td className="w-40 px-2 py-1 tabular text-c-text-3">{k}</td>
                      <td className="px-2 py-1 text-c-text-2">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
