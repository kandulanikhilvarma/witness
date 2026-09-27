// Console skeleton. Shown while a view's server queries run, in the same grid
// the records page lands in, so nothing jumps when the data arrives. Static
// blocks, no shimmer: ISA-101 keeps the bench still.
export default function ConsoleLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-7 w-48 rounded-sm bg-c-line/60" />
      <div className="mt-2 h-4 w-80 max-w-full rounded-sm bg-c-line/40" />
      <div className="mt-6 h-9 rounded-sm border border-c-line bg-c-surface" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-sm border border-c-line bg-c-surface" />
        ))}
      </div>
      <div className="mt-6 space-y-px overflow-hidden rounded-sm border border-c-line">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-c-surface" />
        ))}
      </div>
    </div>
  );
}
