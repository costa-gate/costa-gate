export function Header() {
  return (
    <header className="rounded-[28px] border border-white/10 bg-slate-900/70 px-5 py-5 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Terminal operacional</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-50">Dashboard Costa Gate</h1>
          <p className="mt-1 text-sm text-slate-400">Visão geral do controle logístico e operações da unidade.</p>
        </div>
        <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300">
          Relatórios
        </button>
      </div>
    </header>
  );
}
