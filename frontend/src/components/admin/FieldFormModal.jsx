import { useState } from 'react'
import { createField, updateField } from '../../api/resources'
import { SPORT_LABELS, SURFACE_LABELS, SPORT_BY_LABEL } from '../../lib/labels'

const SURFACE_OPTIONS = Object.entries(SURFACE_LABELS)
const FORMAT_SUGGESTIONS = Object.keys(SPORT_BY_LABEL) // Fotbal 5+1 / 7+1 / 11+1

const SLOT_OPTIONS = [15, 30, 60]
const MIN_BOOKING_OPTIONS = [30, 60, 90, 120]

const inputCls =
  'w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-accent-400 [color-scheme:dark]'

export default function FieldFormModal({ venueId, field, onClose, onSaved }) {
  const isEdit = Boolean(field)
  const [form, setForm] = useState({
    name: field?.name ?? '',
    recommended_format: field?.recommended_format ?? (field ? (SPORT_LABELS[field.sport_type] ?? '') : ''),
    surface_type: field?.surface_type ?? 'synthetic_grass',
    is_indoor: field?.is_indoor ?? false,
    slot_duration_minutes: field?.slot_duration_minutes ?? 30,
    min_booking_minutes: field?.min_booking_minutes ?? 60,
    is_active: field?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.min_booking_minutes % form.slot_duration_minutes !== 0) {
      setError('Durata minimă trebuie să fie multiplu al duratei slotului.')
      return
    }

    const rec = form.recommended_format.trim()
    const payload = {
      name: form.name.trim(),
      recommended_format: rec || null,
      sport_type: SPORT_BY_LABEL[rec] ?? 'football_5',
      surface_type: form.surface_type,
      is_indoor: form.is_indoor,
      slot_duration_minutes: Number(form.slot_duration_minutes),
      min_booking_minutes: Number(form.min_booking_minutes),
      is_active: form.is_active,
    }

    setSaving(true)
    try {
      const saved = isEdit
        ? await updateField(field.id, payload)
        : await createField(venueId, payload)
      onSaved(saved)
    } catch (err) {
      const status = err.response?.status
      setError(
        status === 422
          ? 'Date invalide. Verifică numele și duratele.'
          : 'Salvarea a eșuat. Încearcă din nou.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-2xl bg-panel p-6 shadow-xl ring-1 ring-line"
      >
        <h3 className="text-lg font-bold text-white">{isEdit ? 'Editează terenul' : 'Teren nou'}</h3>

        <Field label="Nume">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="ex: Terenul 2"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Format recomandat (opțional)">
            <input
              type="text"
              list="format-suggestions"
              value={form.recommended_format}
              onChange={(e) => set('recommended_format', e.target.value)}
              placeholder="ex: 5+1"
              className={inputCls}
            />
            <datalist id="format-suggestions">
              {FORMAT_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Suprafață">
            <Select value={form.surface_type} onChange={(v) => set('surface_type', v)} options={SURFACE_OPTIONS} />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Recomandare pentru jucători (ex: „5+1" = 5 + portar). Poți alege o sugestie,
          tasta liber sau lăsa gol.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Durată slot (min)">
            <Select
              value={form.slot_duration_minutes}
              onChange={(v) => set('slot_duration_minutes', Number(v))}
              options={SLOT_OPTIONS.map((n) => [n, `${n} min`])}
            />
          </Field>
          <Field label="Rezervare minimă (min)">
            <Select
              value={form.min_booking_minutes}
              onChange={(v) => set('min_booking_minutes', Number(v))}
              options={MIN_BOOKING_OPTIONS.map((n) => [n, `${n} min`])}
            />
          </Field>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <input type="checkbox" checked={form.is_indoor} onChange={(e) => set('is_indoor', e.target.checked)} className="accent-[var(--color-accent-400)]" />
            Acoperit
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="accent-[var(--color-accent-400)]" />
            Activ (vizibil clienților)
          </label>
        </div>

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
            {saving ? 'Se salvează…' : isEdit ? 'Salvează' : 'Creează'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  )
}
