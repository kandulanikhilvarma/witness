import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import { IntakeForm } from "@/components/intake-form";
import { STANDARD, type PartFamily } from "@/lib/iso";
import {
  MIN_REFERENCE_IMAGES,
  createEnrolment,
  createFamily,
  enrolmentDetail,
  listEnrolments,
  listFamilies,
} from "@/lib/enrolment";

export const dynamic = "force-dynamic";

async function addFamily(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "bearing") as PartFamily;
  const sku = String(formData.get("sku") ?? "").trim() || null;
  if (!name) return;
  const id = await createFamily(name, kind, sku);
  revalidatePath("/console/enrol");
  if (id) redirect(`/console/enrol?family=${id}`);
}

async function addEnrolment(formData: FormData) {
  "use server";
  const familyId = String(formData.get("family_id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "Reference set";
  if (!familyId) return;
  const id = await createEnrolment(familyId, name);
  revalidatePath("/console/enrol");
  if (id) redirect(`/console/enrol?family=${familyId}&enrol=${id}`);
}

export default async function EnrolPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string; enrol?: string }>;
}) {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-8 text-c-text">
        <h1 className="font-display text-2xl">Enrolment</h1>
        <p className="mt-2 text-sm text-c-text-2">
          Enrolment runs on the Supabase workspace. This deployment is on the
          local database.
        </p>
      </div>
    );
  }
  const session = await currentSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const families = await listFamilies();
  const familyId = sp.family && families.some((f) => f.id === sp.family) ? sp.family : families[0]?.id;
  const family = families.find((f) => f.id === familyId);
  const enrolments = familyId ? await listEnrolments(familyId) : [];
  const enrolId = sp.enrol && enrolments.some((e) => e.id === sp.enrol) ? sp.enrol : enrolments[0]?.id;
  const detail = enrolId ? await enrolmentDetail(enrolId) : null;

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Enrolment</h1>
        <p className="mt-1 text-sm text-c-text-2">
          Teach Witness what a good part looks like. Pick a part family, open a
          reference set, and add known-good photos. The anomaly model trains on
          this set — nothing else — so it stays specific to your parts.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Left rail: families + their reference sets. */}
        <aside className="space-y-6">
          <section>
            <h2 className="mb-2 text-2xs uppercase tracking-wide text-c-text-3">Part families</h2>
            <div className="space-y-1">
              {families.map((f) => (
                <Link
                  key={f.id}
                  href={`/console/enrol?family=${f.id}`}
                  className={`block rounded-sm border px-3 py-2 text-sm ${
                    f.id === familyId
                      ? "border-c-focus bg-c-surface-2 text-c-text"
                      : "border-c-line bg-c-surface text-c-text-2 hover:border-c-focus"
                  }`}
                >
                  {f.name}
                  <span className="ml-1 text-2xs text-c-text-3">· {f.kind}</span>
                </Link>
              ))}
              {families.length === 0 && (
                <p className="rounded-sm border border-dashed border-c-line p-3 text-2xs text-c-text-3">
                  No families yet. Add one below.
                </p>
              )}
            </div>
            <form action={addFamily} className="mt-3 space-y-2 rounded-sm border border-c-line bg-c-surface p-3">
              <input
                name="name"
                required
                placeholder="e.g. 6205 deep-groove"
                className="w-full rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3"
              />
              <div className="flex gap-2">
                <select
                  name="kind"
                  className="flex-1 rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-2xs text-c-text"
                >
                  <option value="bearing">Bearing</option>
                  <option value="gear">Gear</option>
                </select>
                <input
                  name="sku"
                  placeholder="SKU pattern"
                  className="flex-1 rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-2xs text-c-text placeholder:text-c-text-3"
                />
              </div>
              <button className="w-full rounded-sm bg-c-focus px-3 py-1.5 text-2xs font-medium text-paper">
                Add family
              </button>
            </form>
          </section>

          {family && (
            <section>
              <h2 className="mb-2 text-2xs uppercase tracking-wide text-c-text-3">Reference sets</h2>
              <div className="space-y-1">
                {enrolments.map((e) => (
                  <Link
                    key={e.id}
                    href={`/console/enrol?family=${familyId}&enrol=${e.id}`}
                    className={`flex items-center justify-between rounded-sm border px-3 py-2 text-sm ${
                      e.id === enrolId
                        ? "border-c-focus bg-c-surface-2 text-c-text"
                        : "border-c-line bg-c-surface text-c-text-2 hover:border-c-focus"
                    }`}
                  >
                    <span>{e.name ?? "Reference set"}</span>
                    <StatusPill status={e.status} count={e.image_count} />
                  </Link>
                ))}
                {enrolments.length === 0 && (
                  <p className="rounded-sm border border-dashed border-c-line p-3 text-2xs text-c-text-3">
                    No reference sets for {family.name}.
                  </p>
                )}
              </div>
              <form action={addEnrolment} className="mt-3 flex gap-2 rounded-sm border border-c-line bg-c-surface p-3">
                <input type="hidden" name="family_id" value={family.id} />
                <input
                  name="name"
                  placeholder="Set name"
                  className="flex-1 rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-2xs text-c-text placeholder:text-c-text-3"
                />
                <button className="rounded-sm border border-c-line bg-c-surface-2 px-3 py-1.5 text-2xs text-c-text hover:border-c-focus">
                  New set
                </button>
              </form>
            </section>
          )}
        </aside>

        {/* Right: the selected reference set. */}
        <main>
          {!detail ? (
            <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
              {family
                ? "Open or create a reference set to start adding photos."
                : "Create a part family to begin."}
            </p>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg">
                    {detail.enrolment.name} · {family?.name}
                  </h2>
                  <p className="text-2xs text-c-text-3">
                    {STANDARD[family?.kind ?? "bearing"]} · {detail.enrolment.image_count}{" "}
                    reference {detail.enrolment.image_count === 1 ? "image" : "images"}
                  </p>
                </div>
                <StatusPill status={detail.enrolment.status} count={detail.enrolment.image_count} />
              </div>

              {detail.enrolment.image_count < MIN_REFERENCE_IMAGES && (
                <p className="mb-4 rounded-sm border border-sev-1/40 bg-sev-1-bg px-3 py-2 text-2xs text-sev-1">
                  {MIN_REFERENCE_IMAGES}+ images make a stable normal-set. This set
                  has {detail.enrolment.image_count}. Training refuses below the
                  floor.
                </p>
              )}

              <IntakeForm enrolmentId={detail.enrolment.id} />

              <div className="mt-4 flex items-center gap-3">
                <button
                  disabled
                  title="Coreset training arrives in Phase 4 pass 2"
                  className="rounded-sm border border-c-line bg-c-surface px-4 py-2 text-sm text-c-text-3 opacity-60"
                >
                  Train coreset
                </button>
                <span className="rounded-sm border border-c-line px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide text-c-text-3">
                  Pass 2
                </span>
                <span className="text-2xs text-c-text-3">
                  PatchCore training + scoring lands next.
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {detail.refs.map((r) => (
                  <figure key={r.id} className="space-y-1">
                    {r.thumb ? (
                      <Image
                        src={r.thumb}
                        alt={r.image_name ?? "reference"}
                        width={120}
                        height={120}
                        unoptimized
                        className="w-full rounded-sm border border-c-line object-cover"
                      />
                    ) : (
                      <div className="aspect-square rounded-sm border border-dashed border-c-line" />
                    )}
                    <figcaption className="truncate text-2xs text-c-text-3" title={r.image_name ?? ""}>
                      {r.image_name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatusPill({ status, count }: { status: string; count: number }) {
  const tone =
    status === "ready"
      ? "border-sev-0/40 bg-sev-0-bg text-sev-0"
      : status === "training"
        ? "border-sev-1/40 bg-sev-1-bg text-sev-1"
        : status === "failed"
          ? "border-sev-3/40 bg-sev-3-bg text-sev-3"
          : "border-c-line text-c-text-3";
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide ${tone}`}>
      {status} · {count}
    </span>
  );
}
