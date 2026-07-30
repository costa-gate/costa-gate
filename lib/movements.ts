import { supabase } from '@/lib/supabase';
import type { StatusMovimentacao, VehicleMovement } from '@/types';

const ensureAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
};

type MovementFileMap = {
  fotoVeiculo?: File | null;
  fotoContainer?: File | null;
  fotoDocumento?: File | null;
};

type MovementInput = Omit<Partial<VehicleMovement>, 'id' | 'entrada' | 'status'> & {
  fotos?: {
    fotoVeiculo?: string | null;
    fotoContainer?: string | null;
    fotoDocumento?: string | null;
  };
  files?: MovementFileMap;
};

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
  status: String(row.status ?? 'Na Portaria') as StatusMovimentacao,
});

const buildPayload = (input: MovementInput, now: string) => ({
  unidade: input.unidade ?? 'JAV 1',
  placa_cavalo: input.placaCavalo ?? '',
  placa_carreta: input.placaCarreta ?? '',
  motorista: input.motorista ?? '',
  telefone: input.telefone ?? '',
  transportadora: input.transportadora ?? '',
  cliente: input.cliente ?? '',
  numero_container: input.numeroContainer ?? '',
  lacre: input.lacre ?? '',
  armador: input.armador ?? '',
  tipo_container: input.tipoContainer ?? '',
  condicao: input.condicao ?? '',
  operacao: input.operacao ?? '',
  observacoes: input.observacoes ?? '',
  foto_veiculo: input.fotos?.fotoVeiculo ?? null,
  foto_container: input.fotos?.fotoContainer ?? null,
  foto_documento: input.fotos?.fotoDocumento ?? null,
  entrada_em: now,
  status: 'Na Portaria' as StatusMovimentacao,
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const buildStoragePath = (movementId: string, fieldName: 'fotoVeiculo' | 'fotoContainer' | 'fotoDocumento', file: File) => {
  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${movementId}/${fieldName}-${Date.now()}-${safeName}.${extension}`;
};

const uploadMovementFile = async (movementId: string, fieldName: 'fotoVeiculo' | 'fotoContainer' | 'fotoDocumento', file: File | null) => {
  if (!file) return null;

  const extension = (file.name.split('.').pop() ?? '').toLowerCase();
  const isAllowedExtension = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension);
  const isAllowedMime = allowedMimeTypes.includes(file.type);

  if (!isAllowedExtension || !isAllowedMime) {
    throw new Error('Formato de arquivo não suportado. Envie JPEG, PNG, WebP ou PDF.');
  }

  const path = buildStoragePath(movementId, fieldName, file);
  const { error } = await supabase.storage.from('fotos-portaria').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw new Error(error.message || 'Falha no upload da foto.');
  }

  return path;
};

export const getAllMovements = async (): Promise<VehicleMovement[]> => {
  await ensureAuthenticated();
  const { data, error } = await supabase.from('movimentacoes').select('*').order('entrada_em', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeMovement);
};

export const getActiveMovements = async (): Promise<VehicleMovement[]> => {
  await ensureAuthenticated();
  const { data, error } = await supabase.from('movimentacoes').select('*').neq('status', 'Finalizado').order('entrada_em', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeMovement);
};

export const createMovement = async (input: MovementInput): Promise<VehicleMovement> => {
  await ensureAuthenticated();
  const now = new Date().toISOString();
  const movementId = crypto.randomUUID();

  const filePaths = {
    fotoVeiculo: await uploadMovementFile(movementId, 'fotoVeiculo', input.files?.fotoVeiculo ?? null),
    fotoContainer: await uploadMovementFile(movementId, 'fotoContainer', input.files?.fotoContainer ?? null),
    fotoDocumento: await uploadMovementFile(movementId, 'fotoDocumento', input.files?.fotoDocumento ?? null),
  };

  const payload = buildPayload({
    ...input,
    fotos: {
      fotoVeiculo: filePaths.fotoVeiculo ?? input.fotos?.fotoVeiculo ?? null,
      fotoContainer: filePaths.fotoContainer ?? input.fotos?.fotoContainer ?? null,
      fotoDocumento: filePaths.fotoDocumento ?? input.fotos?.fotoDocumento ?? null,
    },
  }, now);

  const { data, error } = await supabase.from('movimentacoes').insert([{ ...payload, id: movementId }]).select().single();
  if (error) throw new Error(error.message);
  return normalizeMovement(data as Record<string, unknown>);
};

export const finalizeMovement = async (id: string): Promise<VehicleMovement | null> => {
  await ensureAuthenticated();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('movimentacoes').update({ status: 'Finalizado', saida_em: now }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data ? normalizeMovement(data as Record<string, unknown>) : null;
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

export const counts = (items: VehicleMovement[]) => {
  const now = new Date();
  const isSameDay = (dstr?: string | null) => {
    if (!dstr) return false;
    const d = new Date(dstr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  return {
    ativos: items.filter((item) => item.status !== 'Finalizado' && !item.saida).length,
    entradasHoje: items.filter((item) => isSameDay(item.entrada)).length,
    saidasHoje: items.filter((item) => isSameDay(item.saida)).length,
    total: items.length,
  };
};

export const getMovementStats = async () => {
  const movements = await getAllMovements();
  return counts(movements);
};

export const getSignedPhotoUrl = async (path: string | null | undefined) => {
  await ensureAuthenticated();
  if (!path) return null;
  const { data, error } = await supabase.storage.from('fotos-portaria').createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

export const subscribeToMovements = (callback: () => void) => {
  const channel = supabase.channel('movimentacoes-realtime');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, () => {
    callback();
  });
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
