// Camp de formular reutilizabil: eticheta + input stilizat (tema Aurora).
// Folosit de LoginPage si RegisterPage ca sa nu repetam acelasi markup.
export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  autoComplete,
  placeholder,
  minLength,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-accent-400"
      />
    </label>
  )
}
