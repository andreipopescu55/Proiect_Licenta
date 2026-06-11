import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PitchIcon, MenuIcon, CloseIcon } from './ui/icons'

const ROLE_LABELS = {
  client: 'Client',
  venue_admin: 'Administrator',
  super_admin: 'Super Admin',
}

function navLinkClass({ isActive }) {
  const base = 'rounded-lg px-3 py-2 text-sm font-semibold transition'
  return isActive
    ? `${base} bg-brand-50 text-brand-700`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isAdmin = user && (user.role === 'venue_admin' || user.role === 'super_admin')
  const isClient = user && user.role === 'client'

  function handleLogout() {
    logout()
    setOpen(false)
    navigate('/')
  }

  // Link-urile de navigatie (refolosite pe desktop + mobil).
  const links = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={() => setOpen(false)}>
        Acasă
      </NavLink>
      {isClient && (
        <NavLink to="/rezervarile-mele" className={navLinkClass} onClick={() => setOpen(false)}>
          Rezervările mele
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin" className={navLinkClass} onClick={() => setOpen(false)}>
          Admin
        </NavLink>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <PitchIcon className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">
            Rezervări Terenuri
          </span>
        </Link>

        {/* Link-uri centrale (desktop) */}
        <div className="hidden items-center gap-1 sm:flex">{links}</div>

        {/* Zona auth (desktop) */}
        <div className="hidden items-center gap-3 sm:flex">
          {isAuthenticated ? (
            <>
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight text-slate-900">
                  {user.full_name}
                </p>
                <p className="text-xs leading-tight text-slate-500">
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Autentificare
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Cont nou
              </Link>
            </>
          )}
        </div>

        {/* Buton meniu (mobil) */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Închide meniul' : 'Deschide meniul'}
          aria-expanded={open}
          className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 sm:hidden"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {/* Panou mobil */}
      {open && (
        <div className="animate-fade-in border-t border-slate-100 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">{links}</div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Autentificare
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Cont nou
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
