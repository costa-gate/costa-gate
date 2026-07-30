import type { ReactNode } from 'react';

type MetricCardProps = {
  title: string;
  value: string;
  description?: string;
  accent?: string;
  icon?: ReactNode;
};

export function MetricCard({ title, value, description, accent = 'border-white/10 bg-slate-900/70', icon }: MetricCardProps) {
  return (
    <div className={`rounded-2xl border ${accent} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
          {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
        </div>
        {icon ? <div className="rounded-xl bg-slate-950/60 p-2 text-emerald-300">{icon}</div> : null}
      </div>
    </div>
  );
}
