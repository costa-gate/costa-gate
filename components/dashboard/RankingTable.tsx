type RankingTableProps = {
  title: string;
  rows: Array<{ label: string; value: number | string }>;
  metricLabel?: string;
};

export function RankingTable({ title, rows, metricLabel = 'valor' }: RankingTableProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Top 10</span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">Sem dados para exibir.</p>
        ) : rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-200">{row.label}</p>
            </div>
            <span className="ml-3 shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{row.value} {metricLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
