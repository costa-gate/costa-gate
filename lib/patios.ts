import { supabase } from '@/lib/supabase';

export type StatusQuadra =
  | 'Operando'
  | 'Operação Restrita'
  | 'Em Manutenção'
  | 'Bloqueada'
  | 'Inativa';

export type PatioTerminal = {
  id: string;
  unidade: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type QuadraTerminal = {
  id: string;
  patioId: string;
  patioNome: string;
  unidade: string;
  nome: string;
  codigo: string;
  capacidadeOriginal: number;
  capacidadeOperacional: number;
  status: StatusQuadra;
  permiteArmazenamento: boolean;
  motivoRestricao?: string | null;
  inicioRestricao?: string | null;
  previsaoLiberacao?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  ocupacao: number;
  livres: number;
  percentualOcupacao: number;
  criadoPor?: string | null;
  atualizadoPor?: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ContainerDaQuadra = {
  id: string;
  quadraId?: string | null;
  numeroContainer: string;
  cliente?: string | null;
  armador?: string | null;
  tipoContainer?: string | null;
  condicao?: string | null;
  status: string;
  unidade: string;
  patio?: string | null;
  quadra?: string | null;
  pilha?: string | null;
  fila?: string | null;
  altura?: number | null;
  posicao?: string | null;
  entradaEm?: string | null;
  placaAtual?: string | null;
};

export type AtualizarQuadraInput = {
  quadraId: string;
  capacidadeOperacional: number;
  status: StatusQuadra;
  permiteArmazenamento: boolean;
  motivoRestricao?: string | null;
  inicioRestricao?: string | null;
  previsaoLiberacao?: string | null;
  observacoes?: string | null;
};

type DatabaseRow = Record<string, unknown>;

const ensureAuthenticated = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');

  return session.user;
};

const asText = (value: unknown, fallback = '') =>
  value === null || value === undefined ? fallback : String(value);

const asNullableText = (value: unknown) =>
  value === null || value === undefined || value === '' ? null : String(value);

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown, fallback = false) =>
  value === null || value === undefined ? fallback : Boolean(value);

const normalizePatio = (row: DatabaseRow): PatioTerminal => ({
  id: asText(row.id),
  unidade: asText(row.unidade),
  nome: asText(row.nome),
  descricao: asNullableText(row.descricao),
  ativo: asBoolean(row.ativo, true),
  criadoEm: asText(row.criado_em),
  atualizadoEm: asText(row.atualizado_em),
});

const normalizeQuadra = (
  row: DatabaseRow,
  ocupacao: number,
): QuadraTerminal => {
  const patio = (row.patios_terminal ?? {}) as DatabaseRow;
  const capacidadeOperacional = asNumber(row.capacidade_operacional);
  const livres = Math.max(0, capacidadeOperacional - ocupacao);
  const percentualOcupacao =
    capacidadeOperacional > 0
      ? Math.min(100, (ocupacao / capacidadeOperacional) * 100)
      : 0;

  return {
    id: asText(row.id),
    patioId: asText(row.patio_id),
    patioNome: asText(patio.nome),
    unidade: asText(patio.unidade),
    nome: asText(row.nome),
    codigo: asText(row.codigo),
    capacidadeOriginal: asNumber(row.capacidade_original),
    capacidadeOperacional,
    status: asText(row.status, 'Operando') as StatusQuadra,
    permiteArmazenamento: asBoolean(row.permite_armazenamento, true),
    motivoRestricao: asNullableText(row.motivo_restricao),
    inicioRestricao: asNullableText(row.inicio_restricao),
    previsaoLiberacao: asNullableText(row.previsao_liberacao),
    observacoes: asNullableText(row.observacoes),
    ativo: asBoolean(row.ativo, true),
    ocupacao,
    livres,
    percentualOcupacao,
    criadoPor: asNullableText(row.criado_por),
    atualizadoPor: asNullableText(row.atualizado_por),
    criadoEm: asText(row.criado_em),
    atualizadoEm: asText(row.atualizado_em),
  };
};

const normalizeContainerDaQuadra = (row: DatabaseRow): ContainerDaQuadra => ({
  id: asText(row.id),
  quadraId: asNullableText(row.quadra_id),
  numeroContainer: asText(row.numero_container),
  cliente: asNullableText(row.cliente),
  armador: asNullableText(row.armador),
  tipoContainer: asNullableText(row.tipo_container),
  condicao: asNullableText(row.condicao),
  status: asText(row.status),
  unidade: asText(row.unidade),
  patio: asNullableText(row.patio),
  quadra: asNullableText(row.quadra),
  pilha: asNullableText(row.pilha),
  fila: asNullableText(row.fila),
  altura:
    row.altura === null || row.altura === undefined ? null : asNumber(row.altura),
  posicao: asNullableText(row.posicao),
  entradaEm: asNullableText(row.entrada_em),
  placaAtual: asNullableText(row.placa_atual),
});

export const listarPatios = async (): Promise<PatioTerminal[]> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('patios_terminal')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => normalizePatio(row as DatabaseRow));
};

export const listarQuadras = async (): Promise<QuadraTerminal[]> => {
  await ensureAuthenticated();

  const [
    { data: quadras, error: quadrasError },
    { data: containers, error: containersError },
  ] = await Promise.all([
    supabase
      .from('quadras_terminal')
      .select(`
        *,
        patios_terminal (
          nome,
          unidade
        )
      `)
      .eq('ativo', true)
      .order('codigo', { ascending: true }),

    supabase
      .from('containers_terminal')
      .select('quadra_id')
      .neq('status', 'Saiu')
      .not('quadra_id', 'is', null),
  ]);

  if (quadrasError) throw new Error(quadrasError.message);
  if (containersError) throw new Error(containersError.message);

  const ocupacaoPorQuadra = new Map<string, number>();

  for (const row of containers ?? []) {
    const quadraId = asNullableText((row as DatabaseRow).quadra_id);
    if (!quadraId) continue;

    ocupacaoPorQuadra.set(
      quadraId,
      (ocupacaoPorQuadra.get(quadraId) ?? 0) + 1,
    );
  }

  return (quadras ?? []).map((row) => {
    const databaseRow = row as DatabaseRow;
    const quadraId = asText(databaseRow.id);

    return normalizeQuadra(
      databaseRow,
      ocupacaoPorQuadra.get(quadraId) ?? 0,
    );
  });
};

export const listarContainersPorQuadra = async (
  quadraId: string,
): Promise<ContainerDaQuadra[]> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('containers_terminal')
    .select(`
      id,
      quadra_id,
      numero_container,
      cliente,
      armador,
      tipo_container,
      condicao,
      status,
      unidade,
      patio,
      quadra,
      pilha,
      fila,
      altura,
      posicao,
      entrada_em,
      placa_atual
    `)
    .eq('quadra_id', quadraId)
    .neq('status', 'Saiu')
    .order('posicao', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeContainerDaQuadra(row as DatabaseRow),
  );
};


export const buscarContainersAtivos = async (
  termo: string,
): Promise<ContainerDaQuadra[]> => {
  await ensureAuthenticated();

  const normalized = termo.trim().toUpperCase().replace(/\s+/g, '');

  if (normalized.length < 3) return [];

  const { data, error } = await supabase
    .from('containers_terminal')
    .select(`
      id,
      quadra_id,
      numero_container,
      cliente,
      armador,
      tipo_container,
      condicao,
      status,
      unidade,
      patio,
      quadra,
      pilha,
      fila,
      altura,
      posicao,
      entrada_em,
      placa_atual
    `)
    .neq('status', 'Saiu')
    .not('quadra_id', 'is', null)
    .ilike('numero_container', `%${normalized}%`)
    .order('numero_container', { ascending: true })
    .limit(10);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeContainerDaQuadra(row as DatabaseRow),
  );
};

export const getQuadraById = async (
  quadraId: string,
): Promise<QuadraTerminal> => {
  const quadras = await listarQuadras();
  const quadra = quadras.find((item) => item.id === quadraId);

  if (!quadra) throw new Error('Quadra não encontrada.');

  return quadra;
};

export const atualizarQuadra = async (
  input: AtualizarQuadraInput,
): Promise<void> => {
  const user = await ensureAuthenticated();
  const quadra = await getQuadraById(input.quadraId);

  if (
    input.capacidadeOperacional < 0 ||
    input.capacidadeOperacional > quadra.capacidadeOriginal
  ) {
    throw new Error(
      `A capacidade operacional deve ficar entre 0 e ${quadra.capacidadeOriginal}.`,
    );
  }

  if (
    input.capacidadeOperacional > 0 &&
    input.capacidadeOperacional < quadra.ocupacao
  ) {
    throw new Error(
      `A capacidade operacional não pode ficar abaixo da ocupação atual (${quadra.ocupacao}).`,
    );
  }

  const bloqueada =
    input.status === 'Em Manutenção' ||
    input.status === 'Bloqueada' ||
    input.status === 'Inativa';

  const { error } = await supabase
    .from('quadras_terminal')
    .update({
      capacidade_operacional: input.capacidadeOperacional,
      status: input.status,
      permite_armazenamento: bloqueada ? false : input.permiteArmazenamento,
      motivo_restricao: input.motivoRestricao?.trim() || null,
      inicio_restricao: input.inicioRestricao || null,
      previsao_liberacao: input.previsaoLiberacao || null,
      observacoes: input.observacoes?.trim() || null,
      atualizado_por: user.id,
    })
    .eq('id', input.quadraId);

  if (error) throw new Error(error.message);
};

export const validarQuadraParaArmazenamento = async (
  quadraId: string,
): Promise<QuadraTerminal> => {
  const quadra = await getQuadraById(quadraId);

  if (!quadra.ativo) throw new Error('A quadra está inativa.');

  if (!quadra.permiteArmazenamento) {
    throw new Error(
      `${quadra.nome} — ${quadra.patioNome} não permite armazenamento. ${
        quadra.motivoRestricao
          ? `Motivo: ${quadra.motivoRestricao}`
          : ''
      }`,
    );
  }

  if (
    quadra.status === 'Em Manutenção' ||
    quadra.status === 'Bloqueada' ||
    quadra.status === 'Inativa'
  ) {
    throw new Error(
      `${quadra.nome} — ${quadra.patioNome} está ${quadra.status.toLowerCase()}.`,
    );
  }

  if (quadra.ocupacao >= quadra.capacidadeOperacional) {
    throw new Error(
      `${quadra.nome} — ${quadra.patioNome} atingiu a capacidade operacional.`,
    );
  }

  return quadra;
};

export const subscribeToPatios = (callback: () => void) => {
  const channel = supabase.channel(
    `patios-terminal-realtime-${crypto.randomUUID()}`,
  );

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'patios_terminal' },
    callback,
  );

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'quadras_terminal' },
    callback,
  );

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'containers_terminal' },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};