import React from "react";

type Props = {
  step: number;   // começa em 1
  total: number;  // total de steps
};

export default function ProgressBar({ step, total }: Props) {
  const pct = Math.round((step / total) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Progresso</span>
        <span className="text-xs text-slate-500">{pct}%</span>
      </div>

      <div className="progress-track w-full rounded-full overflow-hidden h-2 bg-slate-200/50">
        <div
          className="progress-fill h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex gap-2 items-center justify-center">
        {Array.from({ length: total }).map((_, i) => {
          const active = i < step;
          return (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition ${
                active ? "bg-indigo-600 scale-110" : "bg-slate-300"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
