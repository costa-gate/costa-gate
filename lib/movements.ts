import { supabase } from '@/lib/supabase';
import type { StatusMovimentacao, VehicleMovement } from '@/types';

const ensureAuthenticated = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return session.user;
};

type MovementFileField =
  | 'fotoVeiculo'
  | 'fotoContainer'
  | 'fotoDocumento'
  | 'fotoMaterial'
  | 'fotoNotaFiscal'
  | 'fotoVisitante';

type MovementFileMap = Partial<Record<MovementFileField, File | null>>;

type MovementInput = Omit<Partial<VehicleMovement>, 'id' | 'entrada' | 'status'> & {
  fotos?: Partial<Record<MovementFileField, string | null>>;
  files?: MovementFileMap;
};

const normalizeMovement = (row: Record<string, unknown>): VehicleMovement => ({
  id: String(row.id ?? ''),
  unidade: String(row.unidade ?? 'JAV 1'),

  tipoAcesso: row.tipo_acesso
    ? (String(row.tipo_acesso) as VehicleMovement['tipoAcesso'])
    : undefined,
  portariaEntrada: row.portaria_entrada
    ? (String(row.portaria_entrada) as VehicleMovement['portariaEntrada'])
    : undefined,
  portariaSaida: row.portaria_saida
    ? (String(row.portaria_saida) as VehicleMovement['portariaSaida'])
    : undefined,

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
  observacoesSaida: row.observacoes_saida ? String(row.observacoes_saida) : '',

  nomeVisitante: row.nome_visitante ? String(row.nome_visitante) : '',
  documentoVisitante: row.documento_visitante ? String(row.documento_visitante) : '',
  empresaVisitante: row.empresa_visitante ? String(row.empresa_visitante) : '',
  pessoaVisitada: row.pessoa_visitada ? String(row.pessoa_visitada) : '',
  motivoVisita: row.motivo_visita ? String(row.motivo_visita) : '',

  tipoMaterial: row.tipo_material ? String(row.tipo_material) : '',
  descricaoMaterial: row.descricao_material ? String(row.descricao_material) : '',
  numeroNotaFiscal: row.numero_nota_fiscal ? String(row.numero_nota_fiscal) : '',
  setorDestino: row.setor_destino ? String(row.setor_destino) : '',
  responsavelRecebimento: row.responsavel_recebimento
    ? String(row.responsavel_recebimento)
    : '',
  materialRecebido:
    row.material_recebido === null || row.material_recebido === undefined
      ? undefined
      : Boolean(row.material_recebido),

  fotoVeiculo: row.foto_veiculo ? String(row.foto_veiculo) : null,
  fotoContainer: row.foto_container ? String(row.foto_container) : null,
  fotoDocumento: row.foto_documento ? String(row.foto_documento) : null,
  fotoMaterial: row.foto_material ? String(row.foto_material) : null,
  fotoNotaFiscal: row.foto_nota_fiscal ? String(row.foto_nota_fiscal) : null,
  fotoVisitante: row.foto_visitante ? String(row.foto_visitante) : null,

  entrada: String(row.entrada_em ?? ''),
  saida: row.saida_em ? String(row.saida_em) : null,
  status: String(row.status ?? 'Na Portaria') as StatusMovimentacao,
  tipoSaida: row.tipo_saida
    ? (String(row.tipo_saida) as VehicleMovement['tipoSaida'])
    : undefined,

  criadoPor: row.criado_por ? String(row.criado_por) : null,
  finalizadoPor: row.finalizado_por ? String(row.finalizado_por) : null,
});

const buildPayload = (
  input: MovementInput,
  now: string,
  userId: string,
) => ({
  unidade: input.unidade ?? 'JAV 1',

  tipo_acesso: input.tipoAcesso ?? 'Caminhão Operacional',
  portaria_entrada: input.portariaEntrada ?? null,
  portaria_saida: input.portariaSaida ?? null,

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
  observacoes_saida: input.observacoesSaida ?? '',

  nome_visitante: input.nomeVisitante ?? '',
  documento_visitante: input.documentoVisitante ?? '',
  empresa_visitante: input.empresaVisitante ?? '',
  pessoa_visitada: input.pessoaVisitada ?? '',
  motivo_visita: input.motivoVisita ?? '',

  tipo_material: input.tipoMaterial ?? '',
  descricao_material: input.descricaoMaterial ?? '',
  numero_nota_fiscal: input.numeroNotaFiscal ?? '',
  setor_destino: input.setorDestino ?? '',
  responsavel_recebimento: input.responsavelRecebimento ?? '',
  material_recebido: input.materialRecebido ?? null,

  foto_veiculo: input.fotos?.fotoVeiculo ?? null,
  foto_container: input.fotos?.fotoContainer ?? null,
  foto_documento: input.fotos?.fotoDocumento ?? null,
  foto_material: input.fotos?.fotoMaterial ?? null,
  foto_nota_fiscal: input.fotos?.fotoNotaFiscal ?? null,
  foto_visitante: input.fotos?.fotoVisitante ?? null,

  entrada_em: now,
  status: 'Na Portaria' as StatusMovimentacao,
  criado_por: userId,
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const buildStoragePath = (
  movementId: string,
  fieldName: MovementFileField,
  file: File,
) => {
  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  return `${movementId}/${fieldName}-${Date.now()}-${safeName}.${extension}`;
};

const uploadMovementFile = async (
  movementId: string,
  fieldName: MovementFileField,
  file: File | null,
) => {
  if (!file) return null;

  const extension = (file.name.split('.').pop() ?? '').toLowerCase();
  const isAllowedExtension = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(
    extension,
  );
  const isAllowedMime = allowedMimeTypes.includes(file.type);

  if (!isAllowedExtension || !isAllowedMime) {
    throw new Error(
      'Formato de arquivo não suportado. Envie JPEG, PNG, WebP ou PDF.',
    );
  }

  const path = buildStoragePath(movementId, fieldName, file);

  const { error } = await supabase.storage
    .from('fotos-portaria')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(error.message || 'Falha no upload do arquivo.');
  }

  return path;
};

export const getAllMovements = async (): Promise<VehicleMovement[]> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .order('entrada_em', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(normalizeMovement);
};

export const getActiveMovements = async (): Promise<VehicleMovement[]> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .neq('status', 'Finalizado')
    .order('entrada_em', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(normalizeMovement);
};

export const createMovement = async (
  input: MovementInput,
): Promise<VehicleMovement> => {
  const user = await ensureAuthenticated();
  const now = new Date().toISOString();
  const movementId = crypto.randomUUID();

  const fields: MovementFileField[] = [
    'fotoVeiculo',
    'fotoContainer',
    'fotoDocumento',
    'fotoMaterial',
    'fotoNotaFiscal',
    'fotoVisitante',
  ];

  const uploadedEntries = await Promise.all(
    fields.map(async (field) => [
      field,
      await uploadMovementFile(
        movementId,
        field,
        input.files?.[field] ?? null,
      ),
    ] as const),
  );

  const uploaded = Object.fromEntries(uploadedEntries) as Partial<
    Record<MovementFileField, string | null>
  >;

  const fotos = fields.reduce<Partial<Record<MovementFileField, string | null>>>(
    (result, field) => {
      result[field] = uploaded[field] ?? input.fotos?.[field] ?? null;
      return result;
    },
    {},
  );

  const payload = buildPayload(
    {
      ...input,
      fotos,
    },
    now,
    user.id,
  );

  const { data, error } = await supabase
    .from('movimentacoes')
    .insert([{ ...payload, id: movementId }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeMovement(data as Record<string, unknown>);
};

export const finalizeMovement = async (
  id: string,
): Promise<VehicleMovement | null> => {
  const user = await ensureAuthenticated();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('movimentacoes')
    .update({
      status: 'Finalizado',
      saida_em: now,
      finalizado_por: user.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data ? normalizeMovement(data as Record<string, unknown>) : null;
};

export const formatPermanencia = (
  entrada: string,
  saida?: string | null,
) => {
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

  const isSameDay = (dateString?: string | null) => {
    if (!dateString) return false;

    const date = new Date(dateString);

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  return {
    ativos: items.filter(
      (item) => item.status !== 'Finalizado' && !item.saida,
    ).length,
    entradasHoje: items.filter((item) => isSameDay(item.entrada)).length,
    saidasHoje: items.filter((item) => isSameDay(item.saida)).length,
    total: items.length,
  };
};

export const getMovementStats = async () => {
  const movements = await getAllMovements();
  return counts(movements);
};

export const getSignedPhotoUrl = async (
  path: string | null | undefined,
) => {
  await ensureAuthenticated();

  if (!path) return null;

  const { data, error } = await supabase.storage
    .from('fotos-portaria')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) return null;

  return data.signedUrl;
};

export const subscribeToMovements = (callback: () => void) => {
  const channel = supabase.channel(
    `movimentacoes-realtime-${crypto.randomUUID()}`,
  );

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'movimentacoes',
    },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};