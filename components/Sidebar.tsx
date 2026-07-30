"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const items = [
  { label: 'Nova Entrada', href: '/nova-entrada' },
  { label: 'Veículos na Unidade', href: '/veiculos-na-unidade' },
  { label: 'Consulta', href: '/consulta' },
  { label: 'Painel', href: '/' },
  { label: 'Usuários', href: '/usuarios' },
  { label: 'Configurações', href: '/configuracoes' },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

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

      {user ? (
        <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Conta</p>
            <p className="mt-1 truncate font-medium text-slate-100">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-white/10 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Sair
          </button>
        </div>
      ) : null}
    </aside>
  );
}
