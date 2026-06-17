import { useState } from 'react'
import { createAdminUser } from '../../api/resources'

const inputCls =
  'w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-accent-400'

// Modal pentru crearea unui cont de administrator (folosit de super-admin).
export default function AdminUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', password: '', role: 'venue_admin' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError('Parola trebuie să aibă minim 8 caractere.')
      return
    }
    setSaving(true)
    try {
      const created = await createAdminUser({
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
        role: form.role,
      })
      onCreated(created)
    } catch (err) {
      const s = err.response?.status
      setError(
        s === 409 ? 'Emailul este deja folosit.' : err.response?.data?.detail || 'Crearea contului a eșuat.',
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
          <h3 className="text-lg font-bold text-white">Administrator nou</h3>
          <p className="mt-1 text-sm text-slate-400">
            Creezi contul; comunici email-ul și parola, apoi el își adaugă bazele.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-300">Nume complet</span>
            <input type="text" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
              placeholder="ex: Ion Popescu" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-300">Email</span>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="admin@baza.ro" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-300">Telefon (opțional)</span>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              placeholder="07xxxxxxxx" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-300">Parolă (minim 8 caractere)</span>
            <input type="text" required value={form.password} onChange={(e) => set('password', e.target.value)}
              placeholder="parolă inițială" className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-300">Rol</span>
            <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
              <option value="venue_admin">Administrator bază</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-panel-2">
            Renunță
          </button>
          <button type="submit" disabled={saving}
            className="rounded-lg bg-accent-400 px-4 py-2 text-sm font-bold text-ink transition hover:bg-accent-300 disabled:opacity-50">
            {saving ? 'Se creează…' : 'Creează cont'}
          </button>
        </div>
      </form>
    </div>
  )
}
