type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string | null;
};

export default function Select({ label, error, children, ...props }: Props) {
  return (
    <div className="mb-3">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <select
        {...props}
        className={"w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-400 " + (error ? "border-red-400" : "border-gray-300")}
      >
        {children}
      </select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
