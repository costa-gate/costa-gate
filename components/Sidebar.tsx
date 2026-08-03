"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type MenuItem = {
  label: string;
  href: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const sections: MenuSection[] = [
  {
    title: "Recepção",
    items: [
      { label: "Agendamentos", href: "/agendamentos" },
      { label: "Nova Entrada", href: "/nova-entrada" },
      { label: "Veículos na Unidade", href: "/veiculos-na-unidade" },
    ],
  },
  {
    title: "Operação",
    items: [
      { label: "Controle de Contêineres", href: "/controle-containers" },
      { label: "Fila Operacional", href: "/fila-operacional" },
      { label: "Gestão do Pátio", href: "/gestao-patio" },
      { label: "Consulta", href: "/consulta" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Painel Operacional", href: "/painel-operacional" },
      { label: "Dashboard Gerencial", href: "/dashboard-gerencial" },
    ],
  },
  {
    title: "Administração",
    items: [
      { label: "Usuários", href: "/usuarios" },
      { label: "Configurações", href: "/configuracoes" },
    ],
  },
];

const getInitials = (value?: string | null) => {
  if (!value) return "CG";

  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "CG";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export function Sidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const accountLabel =
    user?.email ??
    (user?.user_metadata?.nome as string | undefined) ??
    "Usuário";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r border-white/10 bg-slate-950/95 px-4 py-6 shadow-2xl backdrop-blur lg:flex">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 font-black text-slate-950 shadow-lg shadow-emerald-500/20">
          CG
        </div>

        <div>
          <p className="font-black text-slate-50">Costa Gate</p>
          <p className="text-xs text-slate-400">Controle Terminal</p>
        </div>
      </div>

      <nav className="mt-7 flex-1 space-y-5 overflow-y-auto pr-1">
        {sections.map((section) => (
          <section key={section.title}>
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
              {section.title}
            </p>

            <div className="mt-2 space-y-2">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                      active
                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                        : "border-white/5 bg-slate-900/75 text-slate-200 hover:border-white/10 hover:bg-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Conta
          </p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-xs font-black text-slate-200">
              {getInitials(accountLabel)}
            </div>

            <p
              title={accountLabel}
              className="min-w-0 truncate text-xs font-bold text-slate-200"
            >
              {accountLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/15"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
