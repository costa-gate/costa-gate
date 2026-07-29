"use client";

import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

type RecordItem = {
  id: string;
  placaCavalo: string;
  placaCarreta: string;
  motorista: string;
  cliente: string;
  container: string;
  lacre: string;
  operacao: string;
  unidade: 'JAV 1' | 'JAV 2';
  entrada: string | null;
  saida: string | null;
  permanencia: string;
  status: string;
};

const FAKE_RECORDS: RecordItem[] = [
  {
    id: 'r1',
    placaCavalo: 'ABC1D23',
    placaCarreta: 'XYZ9E87',
    motorista: 'João Silva',
    cliente: 'GrainCorp',
    container: 'CONT1234567',
    lacre: 'LAC12345',
    operacao: 'Descarregamento',
    unidade: 'JAV 1',
    entrada: '2026-07-29T08:15:00Z',
    saida: null,
    permanencia: '2h 15m',
    status: 'Na Portaria',
  },
  {
    id: 'r2',
    placaCavalo: 'DEF2G45',
    placaCarreta: 'LMN1O23',
    motorista: 'Maria Pereira',
    cliente: 'OceanExport',
    container: 'CONT2345678',
    lacre: 'LAC23456',
    operacao: 'Carregamento',
    unidade: 'JAV 2',
    entrada: '2026-07-29T06:40:00Z',
    saida: '2026-07-29T09:05:00Z',
    permanencia: '2h 25m',
    status: 'Finalizada',
  },
  {
    id: 'r3',
    placaCavalo: 'GHI3J67',
    placaCarreta: 'OPQ4R56',
    motorista: 'Carlos Eduardo',
    cliente: 'LogiTrans',
    container: 'CONT3456789',
    lacre: 'LAC34567',
    operacao: 'Inspeção',
    unidade: 'JAV 1',
    entrada: '2026-07-29T09:30:00Z',
    saida: null,
    permanencia: '1h 0m',
    status: 'Aguardando Saída',
  },
  {
    id: 'r4',
    placaCavalo: 'JKL4K89',
    placaCarreta: 'STU7V89',
    motorista: 'Fernanda Lima',
    cliente: 'ContainerCo',
    container: 'CONT4567890',
    lacre: 'LAC45678',
    operacao: 'Pesagem',
    unidade: 'JAV 2',
    entrada: '2026-07-29T05:20:00Z',
    saida: null,
    permanencia: '4h 25m',
    status: 'Em Operação',
  },
  {
    id: 'r5',
    placaCavalo: 'MNO5L01',
    placaCarreta: 'VWX8Y01',
    motorista: 'Rafael Costa',
    cliente: 'AgroLine',
    container: 'CONT5678901',
    lacre: 'LAC56789',
    operacao: 'Aguardando liberação',
    unidade: 'JAV 1',
    entrada: '2026-07-29T07:10:00Z',
    saida: null,
    permanencia: '2h 55m',
    status: 'Na Portaria',
  },
];

export default function ConsultaPage() {
  const [records] = useState<RecordItem[]>(FAKE_RECORDS);
  const [query, setQuery] = useState('');
  const [fUnidade, setFUnidade] = useState<'Todas' | 'JAV 1' | 'JAV 2'>('Todas');
  const [fCliente, setFCliente] = useState('Todos');
  const [fStatus, setFStatus] = useState('Todos');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);

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
          r.container.toLowerCase().includes(q) ||
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

  const openView = (r: RecordItem) => {
    setSelected(r);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />
      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Consulta</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-50">Consulta</h1>
                <p className="mt-2 text-sm leading-7 text-slate-400">Busque por movimentações por placa, motorista, cliente, contêiner ou lacre</p>
              </div>
              <div className="mt-2 flex gap-2">
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
                onChange={(e) => setFStatus(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
              >
                <option>Todos</option>
                <option>Na Portaria</option>
                <option>Em Operação</option>
                <option>Aguardando Saída</option>
                <option>Finalizada</option>
              </select>

              <div className="flex gap-2">
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none" />
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none" />
              </div>
            </div>

            <div className="mt-6">
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
                        <td className="px-4 py-3">{r.container}</td>
                        <td className="px-4 py-3">{r.lacre}</td>
                        <td className="px-4 py-3">{r.operacao}</td>
                        <td className="px-4 py-3">{r.unidade}</td>
                        <td className="px-4 py-3">{r.entrada ? new Date(r.entrada).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3">{r.saida ? new Date(r.saida).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3">{r.permanencia}</td>
                        <td className="px-4 py-3">{r.status}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openView(r)} className="rounded-2xl border border-white/10 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition hover:bg-sky-500/20">Visualizar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 lg:hidden">
                {filtered.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-400">{r.unidade} • {r.status}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-50">{r.placaCavalo} / {r.placaCarreta}</h3>
                        <p className="mt-1 text-sm text-slate-400">{r.motorista} · {r.cliente}</p>
                        <p className="mt-2 text-sm text-slate-300">{r.container} • {r.operacao}</p>
                        <p className="mt-2 text-xs text-slate-400">Entrada: {r.entrada ? new Date(r.entrada).toLocaleString() : '-'} • Saída: {r.saida ? new Date(r.saida).toLocaleString() : '-'}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <button onClick={() => openView(r)} className="rounded-2xl border border-white/10 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition hover:bg-sky-500/20">Visualizar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {modalOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Detalhes do veículo</h2>
                <p className="mt-1 text-sm text-slate-400">Visualização completa com fotos fictícias</p>
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
                <p className="text-sm font-medium text-slate-50">{selected.container}</p>
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
                <p className="text-sm font-medium text-slate-50">{selected.permanencia}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="text-sm font-medium text-slate-50">{selected.status}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
                <p className="text-sm text-slate-400">Foto veículo</p>
                <div className="mt-2 h-32 w-full rounded-md bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-slate-400">Foto fictícia</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
                <p className="text-sm text-slate-400">Foto contêiner</p>
                <div className="mt-2 h-32 w-full rounded-md bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-slate-400">Foto fictícia</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
                <p className="text-sm text-slate-400">Foto documento</p>
                <div className="mt-2 h-32 w-full rounded-md bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-slate-400">Foto fictícia</div>
              </div>
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
