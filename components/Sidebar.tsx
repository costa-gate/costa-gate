import Link from 'next/link';

const items = [
  { label: 'Nova Entrada', href: '/nova-entrada' },
  { label: 'Veículos na Unidade', href: '/veiculos-na-unidade' },
  { label: 'Consulta', href: '/consulta' },
  { label: 'Painel', href: '#' },
  { label: 'Usuários', href: '#' },
  { label: 'Configurações', href: '#' },
];

export function Sidebar() {
  return (
    <aside className="w-full border-b border-white/10 bg-slate-950/95 px-5 py-5 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:flex lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 font-semibold text-slate-950">
          CG
        </div>
        <div>
          <p className="text-base font-semibold text-slate-50">Costa Gate</p>
          <p className="text-sm text-slate-400">Controle Terminal</p>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-2 lg:mt-8" aria-label="Menu principal">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-transparent bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
