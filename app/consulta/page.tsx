"use client";

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AnexoPreview } from '@/components/anexo-preview';
import Link from 'next/link';
import { formatPermanencia, getAllMovements, getSignedPhotoUrl, subscribeToMovements } from '@/lib/movements';
import type { VehicleMovement } from '@/types';

export default function ConsultaPage() {
  const [records, setRecords] = useState<VehicleMovement[]>([]);
  const [query, setQuery] = useState('');
  const [fUnidade, setFUnidade] = useState<'Todas' | 'JAV 1' | 'JAV 2'>('Todas');
  const [fCliente, setFCliente] = useState('Todos');
  const [fStatus, setFStatus] = useState<'Todos' | 'Na Portaria' | 'Em Operação' | 'Aguardando Saída' | 'Finalizado'>('Todos');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<VehicleMovement | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});
  const [photoLoadState, setPhotoLoadState] = useState<Record<string, { loading: boolean; error: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMovements = async () => {
    try {
      setIsLoading(true);
      const loaded = await getAllMovements();
      setRecords(loaded);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao buscar movimentações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
    const unsubscribe = subscribeToMovements(() => {
      loadMovements();
    });
    return unsubscribe;
  }, []);

  const clientes = useMemo(() => {
    const setC = new Set<string>();
    records.forEach((r) => setC.add(r.cliente));
    return Array.from(setC);
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (fUnidade !== 'Todas' && r.unidade !== fUnidade) return false;
      if (fCliente !== 'Todos' && r.cliente !== fCliente) return false;
      if (fStatus !== 'Todos' && r.status !== fStatus) return false;
      const q = query.trim().toLowerCase();
      if (q) {
        const matches =
          r.placaCavalo.toLowerCase().includes(q) ||
          r.placaCarreta.toLowerCase().includes(q) ||
          r.motorista.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.numeroContainer.toLowerCase().includes(q) ||
          r.lacre.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (periodStart) {
        const start = new Date(periodStart);
        const entrada = r.entrada ? new Date(r.entrada) : null;
        if (!entrada || entrada < start) return false;
      }
      if (periodEnd) {
        const end = new Date(periodEnd);
        const entrada = r.entrada ? new Date(r.entrada) : null;
        if (!entrada || entrada > end) return false;
      }
      return true;
    });
  }, [records, query, fUnidade, fCliente, fStatus, periodStart, periodEnd]);

  const openView = async (r: VehicleMovement) => {
    setSelected(r);
    setModalOpen(true);
    setPhotoLoadState({
      fotoVeiculo: { loading: true, error: false },
      fotoContainer: { loading: true, error: false },
      fotoDocumento: { loading: true, error: false },
    });
    const nextPhotoUrls: Record<string, string | null> = {};
    for (const key of ['fotoVeiculo', 'fotoContainer', 'fotoDocumento'] as const) {
      const path = r[key];
      try {
        nextPhotoUrls[key] = await getSignedPhotoUrl(path ?? null);
      } catch {
        nextPhotoUrls[key] = null;
      }
      setPhotoLoadState((current) => ({
        ...current,
        [key]: {
          loading: false,
          error: !nextPhotoUrls[key],
        },
      }));
    }
    setPhotoUrls(nextPhotoUrls);
  };

  const formatDuration = (entrada?: string | null, saida?: string | null) => {
    if (!entrada) return '-';
    return formatPermanencia(entrada, saida);
  };

  const getStatusClasses = (status?: string | null) => {
    switch (status) {
      case 'Finalizado':
        return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
      case 'Na Portaria':
        return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
      case 'Em Operação':
        return 'border-sky-400/20 bg-sky-500/10 text-sky-300';
      case 'Aguardando Saída':
        return 'border-violet-400/20 bg-violet-500/10 text-violet-300';
      default:
        return 'border-white/10 bg-slate-500/10 text-slate-300';
    }
  };

  const exportCsv = () => {
    const headers = [
      'Placa Cavalo',
      'Placa Carreta',
      'Motorista',
      'Cliente',
      'Contêiner',
      'Lacre',
      'Operação',
      'Unidade',
      'Entrada',
      'Saída',
      'Permanência',
      'Status',
    ];

    const escapeCsv = (value: unknown) => {
      const normalized = String(value ?? '').replace(/"/g, '""');
      return `"${normalized}"`;
    };

    const rows = filtered.map((r) => [
      r.placaCavalo,
      r.placaCarreta,
      r.motorista,
      r.cliente,
      r.numeroContainer,
      r.lacre,
      r.operacao,
      r.unidade,
      r.entrada ? new Date(r.entrada).toLocaleString('pt-BR') : '',
      r.saida ? new Date(r.saida).toLocaleString('pt-BR') : '',
      formatDuration(r.entrada, r.saida),
      r.status,
    ]);

    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `costa-gate-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const generatedAt = new Date().toLocaleString('pt-BR');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <div className="print:hidden"><Sidebar /></div>
      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8 print:hidden">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Consulta</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-50">Consulta</h1>
                <p className="mt-2 text-sm leading-7 text-slate-400">Busque por movimentações por placa, motorista, cliente, contêiner ou lacre</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={printReport}
                  className="rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20"
                >
                  Imprimir / PDF
                </button>
                <Link href="/" className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900">
                  Voltar
                </Link>
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-[32px] border border-white/10 bg-slate-900/50 p-4 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <input
                placeholder="Pesquisar por placa, motorista, cliente, contêiner ou lacre"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="col-span-1 md:col-span-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              />

              <select
                value={fUnidade}
                onChange={(e) => setFUnidade(e.target.value as any)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              >
                <option>Todas</option>
                <option>JAV 1</option>
                <option>JAV 2</option>
              </select>

              <select
                value={fCliente}
                onChange={(e) => setFCliente(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              >
                <option>Todos</option>
                {clientes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value as 'Todos' | 'Na Portaria' | 'Em Operação' | 'Aguardando Saída' | 'Finalizado')}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              >
                <option>Todos</option>
                <option>Na Portaria</option>
                <option>Em Operação</option>
                <option>Aguardando Saída</option>
                <option>Finalizado</option>
              </select>

              <div className="flex gap-2">
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none" />
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none" />
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{errorMessage}</div>
            ) : null}

            <div className="mt-6">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">Carregando movimentações...</div>
              ) : null}

              {!isLoading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">Nenhuma movimentação encontrada.</div>
              ) : null}

              {!isLoading && filtered.length > 0 ? (
              <div className="hidden w-full overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-2 lg:block">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="px-4 py-2">Placa Cavalo</th>
                      <th className="px-4 py-2">Placa Carreta</th>
                      <th className="px-4 py-2">Motorista</th>
                      <th className="px-4 py-2">Cliente</th>
                      <th className="px-4 py-2">Contêiner</th>
                      <th className="px-4 py-2">Lacre</th>
                      <th className="px-4 py-2">Operação</th>
                      <th className="px-4 py-2">Unidade</th>
                      <th className="px-4 py-2">Entrada</th>
                      <th className="px-4 py-2">Saída</th>
                      <th className="px-4 py-2">Permanência</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t border-white/5 text-slate-200">
                        <td className="px-4 py-3">{r.placaCavalo}</td>
                        <td className="px-4 py-3">{r.placaCarreta}</td>
                        <td className="px-4 py-3">{r.motorista}</td>
                        <td className="px-4 py-3">{r.cliente}</td>
                        <td className="px-4 py-3">{r.numeroContainer}</td>
                        <td className="px-4 py-3">{r.lacre}</td>
                        <td className="px-4 py-3">{r.operacao}</td>
                        <td className="px-4 py-3">{r.unidade}</td>
                        <td className="px-4 py-3">{r.entrada ? new Date(r.entrada).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3">{r.saida ? new Date(r.saida).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3">{formatDuration(r.entrada, r.saida)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openView(r)} className="rounded-2xl border border-white/10 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition hover:bg-sky-500/20">Visualizar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : null}

              {!isLoading && filtered.length > 0 ? (
                <div className="grid gap-4 lg:hidden">
                  {filtered.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm text-slate-400">{r.unidade}</p>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(r.status)}`}>
                              {r.status}
                            </span>
                          </div>
                          <h3 className="mt-1 text-lg font-semibold text-slate-50">{r.placaCavalo} / {r.placaCarreta}</h3>
                          <p className="mt-1 text-sm text-slate-400">{r.motorista} · {r.cliente}</p>
                          <p className="mt-2 text-sm text-slate-300">{r.numeroContainer} • {r.operacao}</p>
                          <p className="mt-2 text-xs text-slate-400">Entrada: {r.entrada ? new Date(r.entrada).toLocaleString() : '-'} • Saída: {r.saida ? new Date(r.saida).toLocaleString() : '-'}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <button onClick={() => openView(r)} className="rounded-2xl border border-white/10 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition hover:bg-sky-500/20">Visualizar</button>
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


      <section className="hidden print:block print:bg-white print:p-8 print:text-black">
        <div className="border-b border-slate-300 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Costa Gate</p>
              <h1 className="mt-2 text-2xl font-bold">Relatório de Movimentações</h1>
              <p className="mt-1 text-sm text-slate-600">Controle Logístico Terminal</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Emitido em</p>
              <p className="font-semibold text-slate-900">{generatedAt}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-slate-300 p-4 text-xs">
          <div><span className="font-semibold">Unidade:</span> {fUnidade}</div>
          <div><span className="font-semibold">Cliente:</span> {fCliente}</div>
          <div><span className="font-semibold">Status:</span> {fStatus}</div>
          <div><span className="font-semibold">Pesquisa:</span> {query || 'Sem filtro'}</div>
          <div><span className="font-semibold">Período inicial:</span> {periodStart || 'Não informado'}</div>
          <div><span className="font-semibold">Período final:</span> {periodEnd || 'Não informado'}</div>
        </div>

        <div className="mt-5">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-2 py-2">Placa</th>
                <th className="border border-slate-300 px-2 py-2">Motorista</th>
                <th className="border border-slate-300 px-2 py-2">Cliente</th>
                <th className="border border-slate-300 px-2 py-2">Unidade</th>
                <th className="border border-slate-300 px-2 py-2">Operação</th>
                <th className="border border-slate-300 px-2 py-2">Entrada</th>
                <th className="border border-slate-300 px-2 py-2">Saída</th>
                <th className="border border-slate-300 px-2 py-2">Permanência</th>
                <th className="border border-slate-300 px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`print-${r.id}`}>
                  <td className="border border-slate-300 px-2 py-2">{r.placaCavalo || r.placaCarreta || '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.motorista || '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.cliente || '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.unidade || '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.operacao || '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.entrada ? new Date(r.entrada).toLocaleString('pt-BR') : '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.saida ? new Date(r.saida).toLocaleString('pt-BR') : '-'}</td>
                  <td className="border border-slate-300 px-2 py-2">{formatDuration(r.entrada, r.saida)}</td>
                  <td className="border border-slate-300 px-2 py-2">{r.status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-300 pt-4 text-xs text-slate-600">
          <p>Total de registros: <span className="font-semibold text-slate-900">{filtered.length}</span></p>
          <p>Relatório gerado pelo Costa Gate</p>
        </div>
      </section>

      {modalOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Detalhes do veículo</h2>
                <p className="mt-1 text-sm text-slate-400">Visualização completa com fotos reais do bucket privado</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400">Fechar</button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Placa Cavalo</p>
                <p className="text-sm font-medium text-slate-50">{selected.placaCavalo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Placa Carreta</p>
                <p className="text-sm font-medium text-slate-50">{selected.placaCarreta}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Motorista</p>
                <p className="text-sm font-medium text-slate-50">{selected.motorista}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cliente</p>
                <p className="text-sm font-medium text-slate-50">{selected.cliente}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Contêiner</p>
                <p className="text-sm font-medium text-slate-50">{selected.numeroContainer}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Lacre</p>
                <p className="text-sm font-medium text-slate-50">{selected.lacre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Operação</p>
                <p className="text-sm font-medium text-slate-50">{selected.operacao}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Unidade</p>
                <p className="text-sm font-medium text-slate-50">{selected.unidade}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Entrada</p>
                <p className="text-sm font-medium text-slate-50">{selected.entrada ? new Date(selected.entrada).toLocaleString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Saída</p>
                <p className="text-sm font-medium text-slate-50">{selected.saida ? new Date(selected.saida).toLocaleString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Permanência</p>
                <p className="text-sm font-medium text-slate-50">{formatDuration(selected.entrada, selected.saida)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="text-sm font-medium text-slate-50">{selected.status}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <AnexoPreview
                title="Foto do veículo"
                path={selected?.fotoVeiculo}
                signedUrl={photoUrls.fotoVeiculo ?? null}
                loading={photoLoadState.fotoVeiculo?.loading ?? false}
                error={photoLoadState.fotoVeiculo?.error ?? false}
              />
              <AnexoPreview
                title="Foto do contêiner"
                path={selected?.fotoContainer}
                signedUrl={photoUrls.fotoContainer ?? null}
                loading={photoLoadState.fotoContainer?.loading ?? false}
                error={photoLoadState.fotoContainer?.error ?? false}
              />
              <AnexoPreview
                title="Foto do documento"
                path={selected?.fotoDocumento}
                signedUrl={photoUrls.fotoDocumento ?? null}
                loading={photoLoadState.fotoDocumento?.loading ?? false}
                error={photoLoadState.fotoDocumento?.error ?? false}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setModalOpen(false)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Fechar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
