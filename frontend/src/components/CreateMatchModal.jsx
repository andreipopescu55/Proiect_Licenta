import { useState } from 'react'
import { createMatch } from '../api/resources'
import { SKILL_LABELS } from '../lib/labels'

const inputCls =
  'w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-accent-400 [color-scheme:dark]'

// Sugestii uzuale pentru numarul total de jucatori (X la X + portari).
const SPOT_PRESETS = [
  [10, '5v5'],
  [12, '6v6'],
  [14, '7v7'],
  [22, '11v11'],
]

export default function CreateMatchModal({ booking, fieldLabel, onClose, onCreated }) {
  const [totalSpots, setTotalSpots] = useState(10)
  const [skill, setSkill] = useState('any')
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const spots = Number(totalSpots)
    if (!Number.isInteger(spots) || spots < 2 || spots > 30) {
      setError('Numărul de jucători trebuie să fie între 2 și 30.')
      return
    }
    setSaving(true)
    try {
      const match = await createMatch({
        booking_id: booking.id,
        total_spots: spots,
        skill_level: skill,
        note: note.trim() || null,
        price_per_player: price === '' ? null : Number(price),
      })
      onCreated(match)
    } catch (err) {
      const status = err.response?.status
      setError(
        status === 409
          ? err.response?.data?.detail || 'Există deja un meci pentru această rezervare.'
          : 'Nu am putut deschide meciul. Încearcă din nou.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-2xl bg-panel p-6 shadow-xl ring-1 ring-line"
      >
        <div>
          <h3 className="text-lg font-bold text-white">Deschide un meci</h3>
          <p className="mt-1 text-sm text-slate-400">
            {fieldLabel} · {new Date(booking.start_time).toLocaleString('ro-RO', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-300">Câți jucători în total?</span>
          <input
            type="number"
            min={2}
            max={30}
            required
            value={totalSpots}
            onChange={(e) => setTotalSpots(e.target.value)}
            className={inputCls}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SPOT_PRESETS.map(([n, label]) => (
              <button
                key={n}
                type="button"
                onClick={() => setTotalSpots(n)}
                className={[
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                  Number(totalSpots) === n
                    ? 'bg-accent-400 text-ink'
                    : 'bg-panel-2 text-slate-300 hover:text-white',
                ].join(' ')}
              >
                {label} · {n}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Te numeri și tu (ocupi un loc ca organizator).</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-300">Nivel</span>
          <select value={skill} onChange={(e) => setSkill(e.target.value)} className={inputCls}>
            {Object.entries(SKILL_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-300">
            Cost / jucător (opțional)
          </span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ex: 25"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-500">Informativ — împărțirea banilor se face între voi.</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-300">Mesaj (opțional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex: Lipsesc 2 jucători, aducem noi mingea."
            className={inputCls}
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-panel-2"
          >
            Renunță
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent-400 px-4 py-2 text-sm font-bold text-ink transition hover:bg-accent-300 disabled:opacity-50"
          >
            {saving ? 'Se deschide…' : 'Deschide meciul'}
          </button>
        </div>
      </form>
    </div>
  )
}
