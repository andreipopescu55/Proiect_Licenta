import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listVenues } from '../api/resources'
import { useAuth } from '../auth/AuthContext'
import { SPORT_BY_LABEL } from '../lib/labels'
import { VenueGridSkeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { PitchIcon, SearchIcon, MapPinIcon, ArrowRightIcon } from '../components/ui/icons'

const FORMAT_SUGGESTIONS = Object.keys(SPORT_BY_LABEL) // Fotbal 5+1 / 7+1 / 11+1

export default function HomePage() {
  const { user } = useAuth()
  const [venues, setVenues] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtre
  const [q, setQ] = useState('')
  const [format, setFormat] = useState('')
  const [city, setCity] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [debouncedFormat, setDebouncedFormat] = useState('')

  // Debounce pe câmpurile text (evităm un request la fiecare tastă).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFormat(format), 300)
    return () => clearTimeout(t)
  }, [format])

  // Lista de orașe pentru dropdown — o luăm o singură dată (toate bazele).
  useEffect(() => {
    let active = true
    listVenues()
      .then((data) => active && setCities([...new Set(data.map((v) => v.city))].sort()))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Re-interogăm la schimbarea filtrelor.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const params = {}
    if (debouncedQ.trim()) params.q = debouncedQ.trim()
    if (debouncedFormat.trim()) params.format = debouncedFormat.trim()
    if (city) params.city = city
    listVenues(params)
      .then((data) => active && setVenues(data))
      .catch(() => active && setError('Nu am putut încărca bazele sportive.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [debouncedQ, debouncedFormat, city])

  const hasFilters = Boolean(q || format || city)

  function resetFilters() {
    setQ('')
    setFormat('')
    setCity('')
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-10 text-center shadow-xl sm:p-14">
        {/* accente decorative */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-mint-500/20 blur-2xl" />
        <div className="relative">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20">
            ⚡ Rezervări online · fără telefoane
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Rezervă terenul tău <span className="text-mint-100">în câteva secunde</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">
            {user
              ? `Bine ai venit, ${user.full_name}! Caută o bază sportivă mai jos.`
              : 'Caută baze de fotbal, vezi disponibilitatea și rezervă pe loc.'}
          </p>
        </div>
      </section>

      {/* Bara de căutare / filtrare */}
      <section className="-mt-12 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-100 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Caută după nume, oraș sau județ…"
              aria-label="Caută baze sportive"
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <input
            type="text"
            list="format-filter-suggestions"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="Format (ex: 5+1)"
            aria-label="Filtru după format"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <datalist id="format-filter-suggestions">
            {FORMAT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Filtru după oraș"
            className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Toate orașele</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
          >
            Resetează
          </button>
        </div>
      </section>

      {/* Lista baze sportive */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-slate-900">
          Baze sportive
          {!loading && (
            <span className="ml-2 text-sm font-medium text-slate-400">({venues.length})</span>
          )}
        </h2>

        {loading ? (
          <VenueGridSkeleton count={6} />
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : venues.length === 0 ? (
          <EmptyState
            icon={<PitchIcon className="h-7 w-7" />}
            title={hasFilters ? 'Nicio bază găsită' : 'Nu există baze disponibile'}
            description={
              hasFilters
                ? 'Nicio bază nu corespunde filtrelor alese. Încearcă să le relaxezi.'
                : 'Momentan nu sunt baze sportive aprobate. Revino mai târziu.'
            }
            actionLabel={hasFilters ? 'Resetează filtrele' : undefined}
            onAction={resetFilters}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((v, i) => (
              <Link
                key={v.id}
                to={`/venue/${v.slug}`}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="group animate-fade-in-up rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-brand-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <PitchIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-brand-700">
                  {v.name}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <MapPinIcon className="h-4 w-4 text-slate-400" />
                  {v.city}, {v.county}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                  Vezi terenurile
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
