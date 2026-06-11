// Skeleton loader cu shimmer — folosit in loc de "Se încarcă…" la operatii >1s
// (regula UX: progressive-loading / content-jumping; rezervam spatiul ca sa nu
// existe layout shift).

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

// Card-placeholder pentru o baza sportiva (oglindeste structura cardului real).
export function VenueCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-5 h-4 w-28" />
    </div>
  )
}

// Grila de skeleton-uri (cate carduri vrem in timpul incarcarii).
export function VenueGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  )
}
