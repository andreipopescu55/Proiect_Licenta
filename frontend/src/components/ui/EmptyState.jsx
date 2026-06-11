import { Link } from 'react-router-dom'

// Stare goala consistenta: iconita + titlu + descriere + actiune optionala.
// Inlocuieste "Nu există…" simplu (regula UX: forms-&-feedback / claritate).
export default function EmptyState({ icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {actionLabel &&
        (actionTo ? (
          <Link
            to={actionTo}
            className="mt-5 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {actionLabel}
          </button>
        ))}
    </div>
  )
}
