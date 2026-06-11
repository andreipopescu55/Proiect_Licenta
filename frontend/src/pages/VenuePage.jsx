import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVenue, listVenueFields } from '../api/resources'
import { SURFACE_LABELS, fieldFormat } from '../lib/labels'
import { Skeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import {
  PitchIcon, MapPinIcon, ClockIcon, PhoneIcon, ArrowRightIcon, ArrowLeftIcon,
} from '../components/ui/icons'

const hhmm = (t) => (t ? t.slice(0, 5) : '')

export default function VenuePage() {
  const { slug } = useParams()
  const [venue, setVenue] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getVenue(slug)
      .then((v) => {
        if (!active) return
        setVenue(v)
        return listVenueFields(v.id).then((f) => active && setFields(f))
      })
      .catch(() => active && setError('Baza sportivă nu a fost găsită.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    )
  }
  if (error) return <p className="text-red-600">{error}</p>
  if (!venue) return null

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Toate bazele
      </Link>

      {/* Antet baza */}
      <section className="animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="h-2 bg-gradient-to-r from-brand-500 to-brand-700" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:flex">
              <PitchIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900">{venue.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-slate-500">
                <MapPinIcon className="h-4 w-4 shrink-0 text-slate-400" />
                {venue.address}, {venue.city}, {venue.county}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  {hhmm(venue.opening_time)}–{hhmm(venue.closing_time)}
                </span>
                {venue.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-4 w-4 text-slate-400" />
                    {venue.phone}
                  </span>
                )}
              </div>
              {venue.description && <p className="mt-4 text-slate-600">{venue.description}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Terenuri */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-slate-900">
          Terenuri
          <span className="ml-2 text-sm font-medium text-slate-400">({fields.length})</span>
        </h2>

        {fields.length === 0 ? (
          <EmptyState
            icon={<PitchIcon className="h-7 w-7" />}
            title="Niciun teren disponibil"
            description="Această bază nu are terenuri active momentan."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((f, i) => (
              <div
                key={f.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="group flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition duration-200 animate-fade-in-up hover:-translate-y-1 hover:shadow-xl hover:ring-brand-200"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                    <PitchIcon className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{f.name}</h3>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {fieldFormat(f)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {SURFACE_LABELS[f.surface_type] ?? f.surface_type}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {f.is_indoor ? 'Acoperit' : 'În aer liber'}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Slot {f.slot_duration_minutes} min · minim {f.min_booking_minutes} min
                </p>

                <Link
                  to={`/rezervare/${f.id}`}
                  className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Rezervă
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
