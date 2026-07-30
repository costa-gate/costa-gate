import type { VehicleMovement } from '@/types';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'month' | 'custom';

export type DashboardFilters = {
  period: DashboardPeriod;
  startDate: string;
  endDate: string;
  unidade: string;
  cliente: string;
  operacao: string;
};

export type DashboardMetricSummary = {
  ativos: number;
  entradas: number;
  saidas: number;
  total: number;
  permanenciaMedia: string;
  maiorPermanencia: string;
  ativos24h: number;
  ativos48h: number;
  percentualFotos: string;
  fotosVeiculo: number;
  fotosContainer: number;
  fotosDocumento: number;
};

export type RankingItem = {
  label: string;
  value: number;
};

const parseDateValue = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultDashboardFilters = (): DashboardFilters => {
  const today = new Date();
  return {
    period: '30d',
    startDate: formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)),
    endDate: formatDateInput(today),
    unidade: 'Todas',
    cliente: 'Todos',
    operacao: 'Todas',
  };
};

export const getDateRange = (filters: DashboardFilters, referenceDate = new Date()) => {
  const now = new Date(referenceDate);
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  if (filters.period === 'custom') {
    const start = parseDateInput(filters.startDate || formatDateInput(now));
    const end = parseDateInput(filters.endDate || formatDateInput(now));
    return {
      start: startOfDay(start),
      end: endOfDay(end),
    };
  }

  if (filters.period === 'today') {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
    };
  }

  if (filters.period === '7d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return {
      start: startOfDay(start),
      end: endOfDay(now),
    };
  }

  if (filters.period === '30d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return {
      start: startOfDay(start),
      end: endOfDay(now),
    };
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: startOfDay(monthStart),
    end: endOfDay(now),
  };
};

const matchesDateRange = (movement: VehicleMovement, filters: DashboardFilters, field: 'entrada' | 'saida') => {
  const { start, end } = getDateRange(filters);
  const date = field === 'entrada' ? parseDateValue(movement.entrada) : parseDateValue(movement.saida);
  if (!date) return false;
  return date >= start && date <= end;
};

export const filterMovements = (movements: VehicleMovement[], filters: DashboardFilters, field: 'entrada' | 'saida' | 'any' = 'entrada') => {
  return movements.filter((movement) => {
    const includeRange = field === 'any'
      ? matchesDateRange(movement, filters, 'entrada')
      : matchesDateRange(movement, filters, field);

    if (!includeRange) return false;

    if (filters.unidade && filters.unidade !== 'Todas' && movement.unidade !== filters.unidade) return false;
    if (filters.cliente && filters.cliente !== 'Todos' && movement.cliente !== filters.cliente) return false;
    if (filters.operacao && filters.operacao !== 'Todas' && movement.operacao !== filters.operacao) return false;

    return true;
  });
};

export const getUniqueValues = (movements: VehicleMovement[], key: 'unidade' | 'cliente' | 'operacao') => {
  const values = movements
    .map((movement) => movement[key])
    .filter(Boolean)
    .map((value) => String(value));

  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
};

export const calculateDashboardMetrics = (movements: VehicleMovement[], filters: DashboardFilters): DashboardMetricSummary => {
  const baseFiltered = filterMovements(movements, filters, 'entrada');
  const finalizados = baseFiltered.filter((movement) => movement.status === 'Finalizado' && movement.saida && movement.entrada);
  const finalizedDurations = finalizados
    .map((movement) => calculateDurationMinutes(movement.entrada, movement.saida))
    .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

  const activeMovements = baseFiltered.filter((movement) => movement.status !== 'Finalizado' && !movement.saida);
  const activeDurations = activeMovements
    .map((movement) => calculateDurationMinutes(movement.entrada))
    .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

  const entradas = filterMovements(movements, filters, 'entrada').length;
  const saidas = filterMovements(movements, filters, 'saida').length;
  const withPhotos = baseFiltered.filter((movement) => Boolean(movement.fotoVeiculo || movement.fotoContainer || movement.fotoDocumento)).length;
  const percentFotos = baseFiltered.length > 0 ? Math.round((withPhotos / baseFiltered.length) * 100) : 0;

  return {
    ativos: activeMovements.length,
    entradas,
    saidas,
    total: baseFiltered.length,
    permanenciaMedia: finalizedDurations.length > 0 ? formatDurationMinutes(Math.round(finalizedDurations.reduce((sum, value) => sum + value, 0) / finalizedDurations.length)) : '—',
    maiorPermanencia: finalizedDurations.length > 0 ? formatDurationMinutes(Math.max(...finalizedDurations)) : '—',
    ativos24h: activeDurations.filter((value) => value >= 24 * 60).length,
    ativos48h: activeDurations.filter((value) => value >= 48 * 60).length,
    percentualFotos: `${percentFotos}%`,
    fotosVeiculo: baseFiltered.filter((movement) => Boolean(movement.fotoVeiculo)).length,
    fotosContainer: baseFiltered.filter((movement) => Boolean(movement.fotoContainer)).length,
    fotosDocumento: baseFiltered.filter((movement) => Boolean(movement.fotoDocumento)).length,
  };
};

export const calculateDurationMinutes = (entrada?: string | null, saida?: string | null): number | null => {
  if (!entrada) return null;
  const start = new Date(entrada).getTime();
  if (Number.isNaN(start)) return null;
  const end = saida ? new Date(saida).getTime() : Date.now();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.floor((end - start) / 60000));
};

export const formatDurationMinutes = (minutes: number) => {
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

export const formatDateTimePtBR = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export const formatDatePtBR = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

export const buildDailySeries = (movements: VehicleMovement[], filters: DashboardFilters) => {
  const { start, end } = getDateRange(filters);
  const dayKeys: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dayKeys.push(formatDateInput(current));
    current.setDate(current.getDate() + 1);
  }

  return dayKeys.map((dayKey) => {
    const date = parseDateInput(dayKey);
    const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const entryCount = filterMovements(movements, { ...filters, period: 'custom', startDate: dayKey, endDate: dayKey }, 'entrada').length;
    const exitCount = filterMovements(movements, { ...filters, period: 'custom', startDate: dayKey, endDate: dayKey }, 'saida').length;
    return { day: label, entradas: entryCount, saidas: exitCount };
  });
};

export const buildClientRanking = (movements: VehicleMovement[], limit = 10): RankingItem[] => {
  const counts = movements.reduce<Record<string, number>>((accumulator, movement) => {
    const key = movement.cliente || 'Sem cliente';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

export const buildTransportadoraRanking = (movements: VehicleMovement[], limit = 10): RankingItem[] => {
  const counts = movements.reduce<Record<string, number>>((accumulator, movement) => {
    const key = movement.transportadora || 'Sem transportadora';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

export const buildOperationSummary = (movements: VehicleMovement[]) => {
  const counts = movements.reduce<Record<string, number>>((accumulator, movement) => {
    const key = movement.operacao || 'Sem operação';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
};

export const buildUnitSummary = (movements: VehicleMovement[]) => {
  const counts = movements.reduce<Record<string, number>>((accumulator, movement) => {
    const key = movement.unidade || 'Sem unidade';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
};

export const buildHourSeries = (movements: VehicleMovement[], filters: DashboardFilters) => {
  const entries = filterMovements(movements, filters, 'entrada');
  return Array.from({ length: 24 }, (_, hour) => {
    const count = entries.filter((movement) => {
      const date = parseDateValue(movement.entrada);
      return date?.getHours() === hour;
    }).length;
    return { hour: `${String(hour).padStart(2, '0')}h`, count };
  });
};

export const buildCustomerDurationRanking = (movements: VehicleMovement[], limit = 10) => {
  const grouped = movements.reduce<Record<string, number[]>>((accumulator, movement) => {
    if (!movement.cliente || !movement.entrada || !movement.saida) return accumulator;
    const duration = calculateDurationMinutes(movement.entrada, movement.saida);
    if (duration === null || duration < 0) return accumulator;
    const list = accumulator[movement.cliente] ?? [];
    list.push(duration);
    accumulator[movement.cliente] = list;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .map(([label, values]) => ({
      label,
      value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

export const buildLongestPermanencias = (movements: VehicleMovement[], limit = 10) => {
  return movements
    .filter((movement) => movement.status === 'Finalizado' && movement.entrada && movement.saida)
    .map((movement) => ({
      id: movement.id,
      label: `${movement.placaCavalo || movement.placaCarreta || 'Sem placa'} · ${movement.cliente || 'Sem cliente'}`,
      value: calculateDurationMinutes(movement.entrada, movement.saida) ?? 0,
      movement,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

export const buildRecentMovements = (movements: VehicleMovement[], limit = 10) => {
  return [...movements]
    .sort((left, right) => new Date(right.entrada).getTime() - new Date(left.entrada).getTime())
    .slice(0, limit);
};
