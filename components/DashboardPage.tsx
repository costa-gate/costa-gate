import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ModuleCard } from './ModuleCard';
import { DashboardStats } from './DashboardStats';

const modules = [
  { title: 'Nova Entrada', description: 'Registre novas cargas e entregas.', icon: '➕' },
  { title: 'Veículos na Unidade', description: 'Acompanhe os veículos ativos.', icon: '🚚' },
  { title: 'Consulta', description: 'Busque por movimentações e histórico.', icon: '🔎' },
  { title: 'Painel', description: 'Visualize indicadores-chave de terminal.', icon: '📊' },
  { title: 'Usuários', description: 'Gerencie acessos e perfis.', icon: '👥' },
  { title: 'Configurações', description: 'Ajuste opções do sistema.', icon: '⚙️' },
];

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />
      <main className="min-h-screen w-full px-4 py-4 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <Header />

          <section className="rounded-[32px] border border-white/10 bg-slate-900/50 p-4 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 rounded-[24px] border border-emerald-500/20 bg-slate-950/60 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Operações em tempo real</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-50">Bem-vindo ao Costa Gate</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                  Controle logístico integrado para terminais, com visão rápida das entradas, veículos e ações operacionais.
                </p>
              </div>
              <DashboardStats />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <ModuleCard
                  key={module.title}
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  href={
                    module.title === 'Nova Entrada'
                      ? '/nova-entrada'
                      : module.title === 'Veículos na Unidade'
                      ? '/veiculos-na-unidade'
                      : module.title === 'Consulta'
                      ? '/consulta'
                      : '#'
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
