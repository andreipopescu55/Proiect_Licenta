import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getField, getFieldPricing, createBooking } from '../api/resources'
import { useAuth } from '../auth/AuthContext'
import { SURFACE_LABELS, fieldFormat } from '../lib/labels'
import { Skeleton } from '../components/ui/Skeleton'
import { PitchIcon, ArrowLeftIcon, ArrowRightIcon } from '../components/ui/icons'
import {
  dowFromDate,
  buildDaySlots,
  estimatePrice,
  minutesToTime,
  localISO,
  defaultBookingDate,
  formatDateRo,
  toDateStr,
} from '../lib/booking'

function StepHeader({ n, title, hint }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400/15 text-xs font-bold text-accent-400">
        {n}
      </span>
      <h2 className="text-sm font-bold text-slate-100">{title}</h2>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  )
}

export default function BookingPage() {
  const { fieldId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [field, setField] = useState(null)
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [date, setDate] = useState('')
  const [startMin, setStartMin] = useState(null)
  const [duration, setDuration] = useState(null)

  const [takenStarts, setTakenStarts] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([getField(fieldId), getFieldPricing(fieldId)])
      .then(([f, p]) => {
        if (!active) return
        setField(f)
        setRules(p)
        setDate(defaultBookingDate(p, f.slot_duration_minutes, f.min_booking_minutes))
      })
      .catch(() => active && setError('Terenul nu a fost găsit.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [fieldId])

  const slotDuration = field?.slot_duration_minutes ?? 30
  const minBooking = field?.min_booking_minutes ?? 60
  const dow = date ? dowFromDate(date) : null

  const slots = useMemo(
    () => (date ? buildDaySlots(rules, dow, slotDuration) : []),
    [rules, date, dow, slotDuration],
  )

  const durationOptions = useMemo(() => {
    const opts = []
    for (let d = minBooking; d <= 240; d += slotDuration) opts.push(d)
    return opts
  }, [minBooking, slotDuration])

  const todayStr = toDateStr(new Date())
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  const price =
    startMin != null && duration != null
      ? estimatePrice(rules, dow, startMin, duration, slotDuration)
      : null

  function resetSelection() {
    setStartMin(null)
    setDuration(null)
    setFormError(null)
  }

  function onChangeDate(e) {
    setDate(e.target.value)
    resetSelection()
  }

  async function handleBooking() {
    setFormError(null)
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (startMin == null || duration == null || price == null) return

    setSubmitting(true)
    try {
      await createBooking({
        field_id: fieldId,
        start_time: localISO(date, startMin),
        end_time: localISO(date, startMin + duration),
      })
      navigate('/rezervarile-mele', { state: { justBooked: true } })
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        setTakenStarts((prev) => new Set(prev).add(startMin))
        setFormError('Acest interval tocmai a fost ocupat. Alege altul.')
        resetSelection()
      } else if (status === 422) {
        setFormError('Interval invalid pentru acest teren. Verifică ora și durata.')
      } else if (status === 401) {
        navigate('/login', { state: { from: location } })
      } else {
        setFormError('A apărut o eroare. Încearcă din nou.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    )
  }
  if (error) return <p className="text-red-400">{error}</p>
  if (!field) return null

  const cardCls = 'rounded-2xl bg-panel p-6 ring-1 ring-line'

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-accent-400 transition hover:text-accent-300"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Înapoi
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Antet teren */}
          <section className="animate-fade-in-up overflow-hidden rounded-2xl bg-panel ring-1 ring-line">
            <div className="h-2 bg-gradient-to-r from-accent-500 to-accent-400" />
            <div className="flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-400/10 text-accent-400">
                <PitchIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-white">{field.name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent-400/10 px-2.5 py-1 text-xs font-semibold text-accent-400">
                    {fieldFormat(field)}
                  </span>
                  <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs font-semibold text-slate-300">
                    {SURFACE_LABELS[field.surface_type] ?? field.surface_type}
                  </span>
                  <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs font-semibold text-slate-300">
                    {field.is_indoor ? 'Acoperit' : 'În aer liber'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Data */}
          <section className={cardCls}>
            <StepHeader n={1} title="Alege data" />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={onChangeDate}
                className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-slate-200 outline-none transition [color-scheme:dark] focus:border-accent-400"
              />
              {date && (
                <span className="rounded-lg bg-accent-400/10 px-3 py-1.5 text-sm font-semibold capitalize text-accent-400">
                  {formatDateRo(date)}
                </span>
              )}
            </div>
          </section>

          {/* Sloturi */}
          <section className={cardCls}>
            <StepHeader n={2} title="Ora de început" hint={slots.length > 0 ? `${slots.length} sloturi` : undefined} />
            {slots.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nu există tarife (deci nici sloturi) pentru această zi. Alege altă dată.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((m) => {
                  const isTaken = takenStarts.has(m)
                  const isPast = date === todayStr && m <= nowMin
                  const disabled = isTaken || isPast
                  const selected = m === startMin
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setStartMin(m)
                        setDuration((d) => d ?? minBooking)
                        setFormError(null)
                      }}
                      className={[
                        'rounded-lg px-2 py-2 text-sm font-semibold transition',
                        selected
                          ? 'scale-105 bg-accent-400 text-ink shadow-md shadow-accent-400/20'
                          : disabled
                            ? 'cursor-not-allowed bg-panel-2/50 text-slate-600 line-through'
                            : 'bg-panel-2 text-slate-200 hover:bg-accent-400/10 hover:text-accent-400',
                      ].join(' ')}
                    >
                      {minutesToTime(m)}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Durata */}
          {startMin != null && (
            <section className={`${cardCls} animate-fade-in`}>
              <StepHeader n={3} title="Durată" />
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((d) => {
                  const est = estimatePrice(rules, dow, startMin, d, slotDuration)
                  const ok = est != null
                  const selected = d === duration
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!ok}
                      onClick={() => setDuration(d)}
                      className={[
                        'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                        selected
                          ? 'bg-accent-400 text-ink shadow-md shadow-accent-400/20'
                          : ok
                            ? 'bg-panel-2 text-slate-200 hover:bg-accent-400/10 hover:text-accent-400'
                            : 'cursor-not-allowed bg-panel-2/50 text-slate-600',
                      ].join(' ')}
                    >
                      {d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sumar */}
        <aside className="h-fit overflow-hidden rounded-2xl bg-panel ring-1 ring-line lg:sticky lg:top-20">
          <div className="border-b border-line bg-panel-2/50 px-6 py-4">
            <h2 className="text-base font-bold text-white">Sumar rezervare</h2>
          </div>
          <div className="p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Teren</dt>
                <dd className="text-right font-semibold text-white">{field.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Data</dt>
                <dd className="text-right font-semibold capitalize text-white">
                  {date ? formatDateRo(date) : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Interval</dt>
                <dd className="text-right font-semibold text-white">
                  {startMin != null && duration != null
                    ? `${minutesToTime(startMin)}–${minutesToTime(startMin + duration)}`
                    : '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-xl border border-line bg-panel-2 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-400">Preț estimat</span>
                <span className="text-2xl font-extrabold text-accent-400">
                  {price != null ? `${price.toFixed(2)} RON` : '—'}
                </span>
              </div>
            </div>

            {formError && (
              <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 ring-1 ring-red-500/20">
                {formError}
              </p>
            )}

            <button
              onClick={handleBooking}
              disabled={submitting || startMin == null || duration == null || price == null}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-400 px-4 py-3 text-sm font-bold text-ink transition hover:bg-accent-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Se rezervă…' : user ? 'Rezervă' : 'Autentifică-te ca să rezervi'}
              {!submitting && <ArrowRightIcon className="h-4 w-4" />}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Prețul final e confirmat de server la rezervare.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
