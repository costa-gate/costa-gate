"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Clock3, FileImage, TrendingUp } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { VehicleMovement } from '@/types';

const normalizeMovement = (row: Record<string, unknown>): VehicleMovement => ({
  id: String(row.id ?? ''),
  unidade: String(row.unidade ?? 'JAV 1'),
  placaCavalo: String(row.placa_cavalo ?? ''),
  placaCarreta: String(row.placa_carreta ?? ''),
  motorista: String(row.motorista ?? ''),
  telefone: row.telefone ? String(row.telefone) : '',
  transportadora: row.transportadora ? String(row.transportadora) : '',
  cliente: String(row.cliente ?? ''),
  numeroContainer: String(row.numero_container ?? ''),
  lacre: String(row.lacre ?? ''),
  armador: row.armador ? String(row.armador) : '',
  tipoContainer: row.tipo_container ? String(row.tipo_container) : '',
  condicao: row.condicao ? String(row.condicao) : '',
  operacao: String(row.operacao ?? ''),
  observacoes: row.observacoes ? String(row.observacoes) : '',
  fotoVeiculo: row.foto_veiculo ? String(row.foto_veiculo) : null,
  fotoContainer: row.foto_container ? String(row.foto_container) : null,
  fotoDocumento: row.foto_documento ? String(row.foto_documento) : null,
  entrada: String(row.entrada_em ?? ''),
  saida: row.saida_em ? String(row.saida_em) : null,
  status: String(row.status ?? 'Na Portaria'),
});

const toTimestamp = (value?: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const formatDurationMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    const suffix = hours > 0 ? ` ${hours}h` : '';
    const minuteSuffix = mins > 0 ? ` ${mins}m` : '';
    return `${days}d${suffix}${minuteSuffix}`;
  }
  if (hours > 0) {
    const minuteSuffix = mins > 0 ? ` ${mins}m` : '';
    return `${hours}h${minuteSuffix}`;
  }
  return `${mins}m`;
};

const formatDateTimePtBR = (value?: string | null) => {
  if (!value) return '—';
  const timestamp = toTimestamp(value);
  if (timestamp === null) return '—';
  return new Date(timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export function ManagementDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<VehicleMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    const loadMovements = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          if (isMounted) {
            setItems([]);
            setLoadedCount(0);
            setError('Sessão expirada. Faça login novamente.');
          }
          return;
        }

        const { data, error: queryError } = await supabase
          .from('movimentacoes')
          .select('*')
          .order('entrada_em', { ascending: false });

        if (!isMounted) return;

        if (queryError) {
          setItems([]);
          setLoadedCount(0);
          setError(queryError.message || 'Erro ao consultar movimentações.');
          return;
        }

        const nextItems = Array.isArray(data) ? data.map((row) => normalizeMovement(row as Record<string, unknown>)) : [];
        setItems(nextItems);
        setLoadedCount(nextItems.length);
      } catch (err) {
        if (isMounted) {
          setItems([]);
          setLoadedCount(0);
          setError(err instanceof Error ? err.message : 'Erro inesperado ao consultar o dashboard.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMovements();
    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const active = items.filter((item) => item.status !== 'Finalizado' && !item.saida);
    const entriesToday = items.filter((item) => {
      const timestamp = toTimestamp(item.entrada);
      return timestamp !== null && timestamp >= todayStart.getTime() && timestamp <= todayEnd.getTime();
    });
    const exitsToday = items.filter((item) => {
      const timestamp = toTimestamp(item.saida);
      return timestamp !== null && timestamp >= todayStart.getTime() && timestamp <= todayEnd.getTime();
    });
    const finalized = items.filter((item) => item.status === 'Finalizado' && item.entrada && item.saida);
    const durations = finalized
      .map((item) => {
        const start = toTimestamp(item.entrada);
        const end = toTimestamp(item.saida);
        if (start === null || end === null) return null;
        return Math.max(0, Math.floor((end - start) / 60000));
      })
      .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);
    const averageMinutes = durations.length > 0 ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;
    const withPhotos = items.filter((item) => Boolean(item.fotoVeiculo || item.fotoContainer || item.fotoDocumento)).length;

    return {
      total: items.length,
      ativos: active.length,
      entradasHoje: entriesToday.length,
      saidasHoje: exitsToday.length,
      permanenciaMedia: formatDurationMinutes(averageMinutes),
      fotos: withPhotos,
    };
  }, [items]);

  const simpleRows = useMemo(() => items.slice(0, 10), [items]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-900/60 p-6">
        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-slate-950/60" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-slate-950/60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100">
        <p className="font-semibold">Erro ao carregar o dashboard</p>
        <p className="mt-2 whitespace-pre-wrap">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Dashboard gerencial</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Painel operacional com dados reais</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              Registros carregados diretamente da tabela movimentacoes. Nesta primeira versão funcional, o painel exibe indicadores e a tabela base para garantir estabilidade.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            <span className="block text-xs uppercase tracking-[0.25em] text-slate-500">Registros carregados</span>
            <span className="mt-1 block text-xl font-semibold text-slate-50">{loadedCount}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm text-slate-400">Total de registros</p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{metrics.total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm text-slate-400">Veículos ativos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{metrics.ativos}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm text-slate-400">Entradas hoje</p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{metrics.entradasHoje}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm text-slate-400">Saídas hoje</p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{metrics.saidasHoje}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock3 className="h-4 w-4" />
            Permanência média
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{metrics.permanenciaMedia}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <FileImage className="h-4 w-4" />
            Registros com foto
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{metrics.fotos}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
          <BarChart3 className="h-4 w-4" />
          Últimas movimentações
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="px-3 py-3">Placa</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Unidade</th>
                <th className="px-3 py-3">Entrada</th>
                <th className="px-3 py-3">Saída</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {simpleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">Nenhuma movimentação encontrada.</td>
                </tr>
              ) : simpleRows.map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="px-3 py-3 text-slate-100">{item.placaCavalo || item.placaCarreta || '—'}</td>
                  <td className="px-3 py-3">{item.cliente || '—'}</td>
                  <td className="px-3 py-3">{item.unidade || '—'}</td>
                  <td className="px-3 py-3">{formatDateTimePtBR(item.entrada)}</td>
                  <td className="px-3 py-3">{formatDateTimePtBR(item.saida)}</td>
                  <td className="px-3 py-3">{item.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
