"use client";

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';
import { formatPermanencia, finalizeMovement, getActiveMovements, subscribeToMovements } from '@/lib/movements';
import type { VehicleMovement } from '@/types';

export default function VeiculosNaUnidadePage() {
  const [query, setQuery] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState<'Todas' | 'JAV 1' | 'JAV 2'>('Todas');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Na Portaria' | 'Em Operação' | 'Aguardando Saída' | 'Finalizado'>('Todos');
  const [data, setData] = useState<VehicleMovement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<VehicleMovement | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [, setClockTick] = useState(0);

  const loadMovements = async () => {
    try {
      setIsLoading(true);
      const loaded = await getActiveMovements();
      setData(loaded);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao buscar veículos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
    const unsubscribe = subscribeToMovements(() => {
      loadMovements();
    });
    const timer = window.setInterval(() => {
      setClockTick((current) => current + 1);
    }, 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

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
        v.numeroContainer.toLowerCase().includes(q)
      );
    });
  }, [data, query, filtroUnidade, filtroStatus]);

  const openModal = (vehicle: VehicleMovement) => {
    setSelected(vehicle);
    setModalOpen(true);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const confirmSaida = async () => {
    if (!selected) return;
    setIsFinalizing(true);
    setErrorMessage('');
    try {
      await finalizeMovement(selected.id);
      setModalOpen(false);
      setSuccessMessage('Saída finalizada com sucesso');
      setData((prev) => prev.filter((p) => p.id !== selected.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao finalizar saída.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const formatDuration = (iso: string) => formatPermanencia(iso, undefined);

  const getHoursInside = (iso: string) =>
    Math.max(0, (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));

  const getPermanenceClasses = (iso: string) => {
    const hours = getHoursInside(iso);
    if (hours >= 24) return 'border-rose-400/30 bg-rose-500/15 text-rose-200';
    if (hours >= 6) return 'border-orange-400/30 bg-orange-500/15 text-orange-200';
    if (hours >= 2) return 'border-amber-400/30 bg-amber-500/15 text-amber-200';
    return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
  };

  const getStatusClasses = (status: VehicleMovement['status']) => {
    if (status === 'Aguardando Saída') {
      return 'border-orange-400/30 bg-orange-500/15 text-orange-200';
    }
    if (status === 'Em Operação') {
      return 'border-amber-400/30 bg-amber-500/15 text-amber-200';
    }
    if (status === 'Finalizado') {
      return 'border-slate-400/30 bg-slate-500/15 text-slate-200';
    }
    return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
  };

  const totalJav1 = data.filter((v) => v.unidade === 'JAV 1').length;
  const totalJav2 = data.filter((v) => v.unidade === 'JAV 2').length;
  const totalAcima24h = data.filter((v) => getHoursInside(v.entrada) >= 24).length;

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
            <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Veículos ativos</p>
                <p className="mt-3 text-4xl font-bold text-slate-50">{data.length}</p>
              </div>
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">JAV 1</p>
                <p className="mt-3 text-4xl font-bold text-emerald-300">{totalJav1}</p>
              </div>
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">JAV 2</p>
                <p className="mt-3 text-4xl font-bold text-cyan-300">{totalJav2}</p>
              </div>
              <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/80">Acima de 24h</p>
                <p className="mt-3 text-4xl font-bold text-rose-300">{totalAcima24h}</p>
              </div>
            </div>

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
                  <option>Finalizado</option>
                </select>
              </div>
            </div>

            {successMessage ? (
              <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">{successMessage}</div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{errorMessage}</div>
            ) : null}

            <div className="mt-6">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">Carregando veículos...</div>
              ) : null}

              {!isLoading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">Nenhum veículo ativo encontrado.</div>
              ) : null}

              {/* Desktop table */}
              {!isLoading && filtered.length > 0 ? (
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
                        <td className="px-4 py-3">{v.numeroContainer}</td>
                        <td className="px-4 py-3">{v.operacao}</td>
                        <td className="px-4 py-3">{v.unidade}</td>
                        <td className="px-4 py-3">{new Date(v.entrada).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPermanenceClasses(v.entrada)}`}>
                            {formatDuration(v.entrada)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(v.status)}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openModal(v)}
                            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                          >
                            Finalizar Saída
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : null}

              {/* Mobile cards */}
              {!isLoading && filtered.length > 0 ? (
                <div className="grid gap-4 lg:hidden">
                  {filtered.map((v) => (
                    <div key={v.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
                              {v.unidade}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(v.status)}`}>
                              {v.status}
                            </span>
                          </div>
                          <h3 className="mt-1 text-lg font-semibold text-slate-50">{v.placaCavalo} / {v.placaCarreta}</h3>
                          <p className="mt-1 text-sm text-slate-400">{v.motorista} · {v.cliente}</p>
                          <p className="mt-2 text-sm text-slate-300">{v.numeroContainer} • {v.operacao}</p>
                          <p className="mt-2 text-xs text-slate-400">Entrada: {new Date(v.entrada).toLocaleString()}</p>
                          <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${getPermanenceClasses(v.entrada)}`}>
                            Permanência: {formatDuration(v.entrada)}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => openModal(v)}
                            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
                          >
                            Finalizar Saída
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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
                <p className="text-sm font-medium text-slate-50">{selected.numeroContainer}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Entrada</p>
                <p className="text-sm font-medium text-slate-50">{new Date(selected.entrada).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Cancelar</button>
              <button onClick={confirmSaida} disabled={isFinalizing} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70">{isFinalizing ? 'Finalizando...' : 'Confirmar Saída'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
