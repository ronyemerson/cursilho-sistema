type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
  hint?: string;
};

export default function Input({ label, error, hint, ...props }: Props) {
  return (
    <div className="mb-3">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        {...props}
        className={
          "w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-400 " +
          (error ? "border-red-400" : "border-gray-300")
        }
      />
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
