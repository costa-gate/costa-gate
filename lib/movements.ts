import { VehicleMovement, STORAGE_KEY, StatusMovimentacao } from '@/types';

const safeParse = (raw: string | null): VehicleMovement[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
};

const readAll = (): VehicleMovement[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
};

const writeAll = (items: VehicleMovement[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const getAllMovements = (): VehicleMovement[] => {
  return readAll();
};

export const getActiveMovements = (): VehicleMovement[] => {
  return readAll().filter((m) => !m.saida);
};

export const createMovement = (input: Omit<Partial<VehicleMovement>, 'id' | 'entrada' | 'status'> & { fotos?: { fotoVeiculo?: string | null; fotoContainer?: string | null; fotoDocumento?: string | null } }) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const m: VehicleMovement = {
    id,
    unidade: (input.unidade as string) || 'JAV 1',
    placaCavalo: (input.placaCavalo as string) || '',
    placaCarreta: (input.placaCarreta as string) || '',
    motorista: (input.motorista as string) || '',
    telefone: (input.telefone as string) || '',
    transportadora: (input.transportadora as string) || '',
    cliente: (input.cliente as string) || '',
    numeroContainer: (input.numeroContainer as string) || '',
    lacre: (input.lacre as string) || '',
    armador: (input.armador as string) || '',
    tipoContainer: (input.tipoContainer as string) || '',
    condicao: (input.condicao as string) || '',
    operacao: (input.operacao as string) || '',
    observacoes: (input.observacoes as string) || '',
    fotoVeiculo: input.fotos?.fotoVeiculo ?? null,
    fotoContainer: input.fotos?.fotoContainer ?? null,
    fotoDocumento: input.fotos?.fotoDocumento ?? null,
    entrada: now,
    saida: null,
    status: 'Na Portaria' as StatusMovimentacao,
  };

  const all = readAll();
  all.unshift(m);
  writeAll(all);
  return m;
};

export const finalizeMovement = (id: string) => {
  const all = readAll();
  const now = new Date().toISOString();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  all[idx].saida = now;
  all[idx].status = 'Finalizado' as StatusMovimentacao;
  writeAll(all);
  return all[idx];
};

export const formatPermanencia = (entrada: string, saida?: string | null) => {
  try {
    const start = new Date(entrada).getTime();
    const end = saida ? new Date(saida).getTime() : Date.now();
    const diff = Math.max(0, end - start);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  } catch {
    return '-';
  }
};

export const counts = () => {
  const all = readAll();
  const now = new Date();
  const isSameDay = (dstr?: string | null) => {
    if (!dstr) return false;
    const d = new Date(dstr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  return {
    ativos: all.filter((a) => !a.saida).length,
    entradasHoje: all.filter((a) => isSameDay(a.entrada)).length,
    saidasHoje: all.filter((a) => isSameDay(a.saida)).length,
    total: all.length,
  };
};

export const clearAll = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};
