"use client";

import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

type Vehicle = {
  id: string;
  placaCavalo: string;
  placaCarreta: string;
  motorista: string;
  cliente: string;
  container: string;
  operacao: string;
  unidade: 'JAV 1' | 'JAV 2';
  entrada: string; // ISO datetime
  permanencia: string;
  status: 'Na Portaria' | 'Em Operação' | 'Aguardando Saída' | 'Finalizada';
};

const FAKE_DATA: Vehicle[] = [
  {
    id: '1',
    placaCavalo: 'ABC1D23',
    placaCarreta: 'XYZ9E87',
    motorista: 'João Silva',
    cliente: 'GrainCorp',
    container: 'CONT1234567',
    operacao: 'Descarregamento',
    unidade: 'JAV 1',
    entrada: '2026-07-29T08:15:00Z',
    permanencia: '2h 15m',
    status: 'Na Portaria',
  },
  {
    id: '2',
    placaCavalo: 'DEF2G45',
    placaCarreta: 'LMN1O23',
    motorista: 'Maria Pereira',
    cliente: 'OceanExport',
    container: 'CONT2345678',
    operacao: 'Carregamento',
    unidade: 'JAV 2',
    entrada: '2026-07-29T06:40:00Z',
    permanencia: '3h 50m',
    status: 'Em Operação',
  },
  {
    id: '3',
    placaCavalo: 'GHI3J67',
    placaCarreta: 'OPQ4R56',
    motorista: 'Carlos Eduardo',
    cliente: 'LogiTrans',
    container: 'CONT3456789',
    operacao: 'Inspeção',
    unidade: 'JAV 1',
    entrada: '2026-07-29T09:30:00Z',
    permanencia: '1h 0m',
    status: 'Aguardando Saída',
  },
  {
    id: '4',
    placaCavalo: 'JKL4K89',
    placaCarreta: 'STU7V89',
    motorista: 'Fernanda Lima',
    cliente: 'ContainerCo',
    container: 'CONT4567890',
    operacao: 'Pesagem',
    unidade: 'JAV 2',
    entrada: '2026-07-29T05:20:00Z',
    permanencia: '4h 25m',
    status: 'Em Operação',
  },
  {
    id: '5',
    placaCavalo: 'MNO5L01',
    placaCarreta: 'VWX8Y01',
    motorista: 'Rafael Costa',
    cliente: 'AgroLine',
    container: 'CONT5678901',
    operacao: 'Aguardando liberação',
    unidade: 'JAV 1',
    entrada: '2026-07-29T07:10:00Z',
    permanencia: '2h 55m',
    status: 'Na Portaria',
  },
];

export default function VeiculosNaUnidadePage() {
  const [query, setQuery] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState<'Todas' | 'JAV 1' | 'JAV 2'>('Todas');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Na Portaria' | 'Em Operação' | 'Aguardando Saída'>('Todos');
  const [data, setData] = useState<Vehicle[]>(FAKE_DATA);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const filtered = useMemo(() => {
    return data.filter((v) => {
      if (filtroUnidade !== 'Todas' && v.unidade !== filtroUnidade) return false;
      if (filtroStatus !== 'Todos' && v.status !== filtroStatus) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        v.placaCavalo.toLowerCase().includes(q) ||
        v.placaCarreta.toLowerCase().includes(q) ||
        v.motorista.toLowerCase().includes(q) ||
        v.cliente.toLowerCase().includes(q) ||
        v.container.toLowerCase().includes(q)
      );
    });
  }, [data, query, filtroUnidade, filtroStatus]);

  const openModal = (vehicle: Vehicle) => {
    setSelected(vehicle);
    setModalOpen(true);
    setSuccessMessage('');
  };

  const confirmSaida = () => {
    setModalOpen(false);
    setSuccessMessage('Saída finalizada com sucesso');
    if (selected) {
      setData((prev) => prev.map((p) => (p.id === selected.id ? { ...p, status: 'Finalizada' } : p)));
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />
      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Veículos na Unidade</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-50">Veículos na Unidade</h1>
                <p className="mt-2 text-sm leading-7 text-slate-400">Acompanhamento dos veículos atualmente no terminal</p>
              </div>
              <div className="mt-2 flex gap-2">
                <Link href="/" className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900">
                  Voltar
                </Link>
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-[32px] border border-white/10 bg-slate-900/50 p-4 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-col gap-2 md:w-1/2">
                <input
                  placeholder="Buscar por placa, motorista, cliente ou contêiner"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={filtroUnidade}
                  onChange={(e) => setFiltroUnidade(e.target.value as any)}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option>Todas</option>
                  <option>JAV 1</option>
                  <option>JAV 2</option>
                </select>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option>Todos</option>
                  <option>Na Portaria</option>
                  <option>Em Operação</option>
                  <option>Aguardando Saída</option>
                </select>
              </div>
            </div>

            {successMessage ? (
              <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">{successMessage}</div>
            ) : null}

            <div className="mt-6">
              {/* Desktop table */}
              <div className="hidden w-full overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-2 lg:block">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="px-4 py-2">Placa cavalo</th>
                      <th className="px-4 py-2">Placa carreta</th>
                      <th className="px-4 py-2">Motorista</th>
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-4 py-2">Contêiner</th>
                      <th className="px-4 py-2">Operação</th>
                      <th className="px-4 py-2">Unidade</th>
                      <th className="px-4 py-2">Entrada</th>
                      <th className="px-4 py-2">Permanência</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v) => (
                      <tr key={v.id} className="border-t border-white/5 text-slate-200">
                        <td className="px-4 py-3">{v.placaCavalo}</td>
                        <td className="px-4 py-3">{v.placaCarreta}</td>
                        <td className="px-4 py-3">{v.motorista}</td>
                        <td className="px-4 py-3">{v.cliente}</td>
                        <td className="px-4 py-3">{v.container}</td>
                        <td className="px-4 py-3">{v.operacao}</td>
                        <td className="px-4 py-3">{v.unidade}</td>
                        <td className="px-4 py-3">{new Date(v.entrada).toLocaleString()}</td>
                        <td className="px-4 py-3">{v.permanencia}</td>
                        <td className="px-4 py-3">{v.status}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openModal(v)}
                            className="rounded-2xl border border-white/10 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
                          >
                            Finalizar Saída
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-4 lg:hidden">
                {filtered.map((v) => (
                  <div key={v.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-400">{v.unidade} • {v.status}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-50">{v.placaCavalo} / {v.placaCarreta}</h3>
                        <p className="mt-1 text-sm text-slate-400">{v.motorista} · {v.cliente}</p>
                        <p className="mt-2 text-sm text-slate-300">{v.container} • {v.operacao}</p>
                        <p className="mt-2 text-xs text-slate-400">Entrada: {new Date(v.entrada).toLocaleString()} • {v.permanencia}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => openModal(v)}
                          className="rounded-2xl border border-white/10 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
                        >
                          Finalizar Saída
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-50">Confirmar finalização de saída</h2>
            <p className="mt-2 text-sm text-slate-400">Confirme os dados do veículo abaixo:</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Placa cavalo</p>
                <p className="text-sm font-medium text-slate-50">{selected.placaCavalo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Placa carreta</p>
                <p className="text-sm font-medium text-slate-50">{selected.placaCarreta}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Motorista</p>
                <p className="text-sm font-medium text-slate-50">{selected.motorista}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Cliente</p>
                <p className="text-sm font-medium text-slate-50">{selected.cliente}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Contêiner</p>
                <p className="text-sm font-medium text-slate-50">{selected.container}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Entrada</p>
                <p className="text-sm font-medium text-slate-50">{new Date(selected.entrada).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Cancelar</button>
              <button onClick={confirmSaida} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Confirmar Saída</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
