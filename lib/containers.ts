import { supabase } from '@/lib/supabase';
import { validarQuadraParaArmazenamento } from '@/lib/patios';

import type {
  CondicaoContainer,
  ContainerTerminal,
  EventoContainer,
  MontarContainerInput,
  MovimentarContainerInput,
  StatusContainer,
  TipoEventoContainer,
  Unidade,
} from '@/types';

type DatabaseRow = Record<string, unknown>;

type CriarContainerInput = {
  numeroContainer: string;
  unidade: Unidade;
  cliente?: string;
  armador?: string;
  tipoContainer?: string;
  condicao?: CondicaoContainer;
  movimentoEntradaId?: string | null;
  placaEntrada?: string | null;
  observacoes?: string;
};

type DesmontarContainerInput = {
  containerId: string;
  movimentoId?: string | null;
  observacao?: string;
};

type ProgramarSaidaInput = {
  containerId: string;
  movimentoId?: string | null;
  motivo?: string;
  observacao?: string;
};

type FinalizarSaidaContainerInput = {
  containerId: string;
  movimentoId: string;
  placaCavalo: string;
  placaCarreta?: string;
  observacao?: string;
};

type MovimentarContainerComQuadraInput = MovimentarContainerInput & {
  quadraId?: string | null;
  quadra?: string | null;
};

export type ReservarPosicaoContainerInput = {
  containerId: string;
  unidade: Unidade;
  patio: string;
  quadraId: string;
  quadra: string;
  pilha: string;
  fila: string;
  altura: number;
  observacao?: string;
};

export type ConfirmarExecucaoReservaInput = {
  containerId: string;
  observacao?: string;
};

export type CancelarReservaContainerInput = {
  containerId: string;
  motivo?: string;
  observacao?: string;
};

type RegistrarEventoInput = {
  container: ContainerTerminal;
  movimentoId?: string | null;
  tipoEvento: TipoEventoContainer;
  statusAnterior?: StatusContainer | null;
  statusNovo: StatusContainer;
  patioAnterior?: string | null;
  pilhaAnterior?: string | null;
  filaAnterior?: string | null;
  alturaAnterior?: number | null;
  posicaoAnterior?: string | null;
  patioNovo?: string | null;
  pilhaNova?: string | null;
  filaNova?: string | null;
  alturaNova?: number | null;
  posicaoNova?: string | null;
  placaCavalo?: string | null;
  placaCarreta?: string | null;
  motivo?: string;
  observacao?: string;
};

const ensureAuthenticated = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);

  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return session.user;
};

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const normalizeOptionalText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

const normalizeOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeContainerNumber = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, '');

const normalizeSlotPart = (value: string) =>
  value.trim().replace(/\D/g, '').padStart(2, '0');

export const buildPatioPosition = (
  pilha?: string | null,
  fila?: string | null,
  altura?: number | null,
) => {
  if (!pilha || !fila || !altura) return null;

  return `P${normalizeSlotPart(pilha)}-F${normalizeSlotPart(
    fila,
  )}-H${String(altura).padStart(2, '0')}`;
};

const normalizeContainer = (row: DatabaseRow): ContainerTerminal => ({
  id: normalizeText(row.id),
  numeroContainer: normalizeText(row.numero_container),
  unidade: normalizeText(row.unidade),
  cliente: normalizeOptionalText(row.cliente) ?? undefined,
  armador: normalizeOptionalText(row.armador) ?? undefined,
  tipoContainer: normalizeOptionalText(row.tipo_container) ?? undefined,
  condicao: normalizeText(
    row.condicao ?? 'Não Informado',
  ) as CondicaoContainer,
  status: normalizeText(row.status ?? 'Recebido') as StatusContainer,
  patio: normalizeOptionalText(row.patio) ?? undefined,
  pilha: normalizeOptionalText(row.pilha) ?? undefined,
  fila: normalizeOptionalText(row.fila) ?? undefined,
  altura: normalizeOptionalNumber(row.altura) ?? undefined,
  posicao: normalizeOptionalText(row.posicao) ?? undefined,
  movimentoEntradaId: normalizeOptionalText(row.movimento_entrada_id),
  movimentoAtualId: normalizeOptionalText(row.movimento_atual_id),
  movimentoSaidaId: normalizeOptionalText(row.movimento_saida_id),
  placaEntrada: normalizeOptionalText(row.placa_entrada),
  placaAtual: normalizeOptionalText(row.placa_atual),
  placaSaida: normalizeOptionalText(row.placa_saida),
  entradaEm: normalizeText(row.entrada_em),
  desmontadoEm: normalizeOptionalText(row.desmontado_em),
  montadoEm: normalizeOptionalText(row.montado_em),
  saidaEm: normalizeOptionalText(row.saida_em),
  observacoes: normalizeOptionalText(row.observacoes) ?? undefined,
  criadoPor: normalizeOptionalText(row.criado_por),
  atualizadoPor: normalizeOptionalText(row.atualizado_por),
  criadoEm: normalizeOptionalText(row.criado_em) ?? undefined,
  atualizadoEm: normalizeOptionalText(row.atualizado_em) ?? undefined,

  // Campos de planejamento operacional. O cast mantém compatibilidade
  // enquanto os tipos centrais são atualizados em uma etapa posterior.
  quadraReservadaId:
    normalizeOptionalText(row.quadra_reservada_id) ?? undefined,
  patioReservado:
    normalizeOptionalText(row.patio_reservado) ?? undefined,
  quadraReservada:
    normalizeOptionalText(row.quadra_reservada) ?? undefined,
  pilhaReservada:
    normalizeOptionalText(row.pilha_reservada) ?? undefined,
  filaReservada:
    normalizeOptionalText(row.fila_reservada) ?? undefined,
  alturaReservada:
    normalizeOptionalNumber(row.altura_reservada) ?? undefined,
  posicaoReservada:
    normalizeOptionalText(row.posicao_reservada) ?? undefined,
  reservadoEm:
    normalizeOptionalText(row.reservado_em) ?? undefined,
  reservadoPor:
    normalizeOptionalText(row.reservado_por) ?? undefined,
  observacaoReserva:
    normalizeOptionalText(row.observacao_reserva) ?? undefined,
} as ContainerTerminal & Record<string, unknown>);

const normalizeEvent = (row: DatabaseRow): EventoContainer => ({
  id: normalizeText(row.id),
  containerId: normalizeText(row.container_id),
  movimentoId: normalizeOptionalText(row.movimento_id),
  tipoEvento: normalizeText(row.tipo_evento) as TipoEventoContainer,
  statusAnterior: row.status_anterior
    ? (normalizeText(row.status_anterior) as StatusContainer)
    : null,
  statusNovo: normalizeText(row.status_novo) as StatusContainer,
  unidade: normalizeText(row.unidade),
  patioAnterior: normalizeOptionalText(row.patio_anterior),
  pilhaAnterior: normalizeOptionalText(row.pilha_anterior),
  filaAnterior: normalizeOptionalText(row.fila_anterior),
  alturaAnterior: normalizeOptionalNumber(row.altura_anterior),
  posicaoAnterior: normalizeOptionalText(row.posicao_anterior),
  patioNovo: normalizeOptionalText(row.patio_novo),
  pilhaNova: normalizeOptionalText(row.pilha_nova),
  filaNova: normalizeOptionalText(row.fila_nova),
  alturaNova: normalizeOptionalNumber(row.altura_nova),
  posicaoNova: normalizeOptionalText(row.posicao_nova),
  placaCavalo: normalizeOptionalText(row.placa_cavalo),
  placaCarreta: normalizeOptionalText(row.placa_carreta),
  motivo: normalizeOptionalText(row.motivo) ?? undefined,
  observacao: normalizeOptionalText(row.observacao) ?? undefined,
  usuarioId: normalizeOptionalText(row.usuario_id),
  usuarioNome: normalizeOptionalText(row.usuario_nome),
  criadoEm: normalizeText(row.criado_em),
});

const getCurrentUserName = (
  user: Awaited<ReturnType<typeof ensureAuthenticated>>,
) => {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;

  return (
    normalizeOptionalText(metadata?.nome) ??
    normalizeOptionalText(metadata?.name) ??
    normalizeOptionalText(metadata?.full_name) ??
    user.email ??
    'Usuário'
  );
};

const getContainerByIdInternal = async (
  id: string,
): Promise<ContainerTerminal> => {
  const { data, error } = await supabase
    .from('containers_terminal')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  return normalizeContainer(data as DatabaseRow);
};

const ensurePositionAvailable = async ({
  containerId,
  quadraId,
  pilha,
  fila,
  altura,
}: {
  containerId: string;
  quadraId: string;
  pilha: string;
  fila: string;
  altura: number;
}) => {
  const { data, error } = await supabase
    .from('containers_terminal')
    .select('id, numero_container, posicao')
    .eq('quadra_id', quadraId)
    .eq('pilha', pilha)
    .eq('fila', fila)
    .eq('altura', altura)
    .neq('status', 'Saiu')
    .neq('id', containerId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) {
    const row = data as DatabaseRow;
    throw new Error(
      `A posição ${buildPatioPosition(
        pilha,
        fila,
        altura,
      )} já está ocupada pelo contêiner ${normalizeText(
        row.numero_container,
      )}.`,
    );
  }
};



const registerContainerEvent = async (
  input: RegistrarEventoInput,
): Promise<EventoContainer> => {
  const user = await ensureAuthenticated();

  const { data, error } = await supabase
    .from('eventos_container')
    .insert([
      {
        container_id: input.container.id,
        movimento_id: input.movimentoId ?? null,
        tipo_evento: input.tipoEvento,
        status_anterior: input.statusAnterior ?? null,
        status_novo: input.statusNovo,
        unidade: input.container.unidade,
        patio_anterior: input.patioAnterior ?? null,
        pilha_anterior: input.pilhaAnterior ?? null,
        fila_anterior: input.filaAnterior ?? null,
        altura_anterior: input.alturaAnterior ?? null,
        posicao_anterior: input.posicaoAnterior ?? null,
        patio_novo: input.patioNovo ?? null,
        pilha_nova: input.pilhaNova ?? null,
        fila_nova: input.filaNova ?? null,
        altura_nova: input.alturaNova ?? null,
        posicao_nova: input.posicaoNova ?? null,
        placa_cavalo: input.placaCavalo ?? null,
        placa_carreta: input.placaCarreta ?? null,
        motivo: input.motivo ?? null,
        observacao: input.observacao ?? null,
        usuario_id: user.id,
        usuario_nome: getCurrentUserName(user),
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeEvent(data as DatabaseRow);
};

export const getContainers = async (): Promise<ContainerTerminal[]> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('containers_terminal')
    .select('*')
    .order('entrada_em', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeContainer(row as DatabaseRow),
  );
};

export const getActiveContainers = async (): Promise<
  ContainerTerminal[]
> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('containers_terminal')
    .select('*')
    .neq('status', 'Saiu')
    .order('entrada_em', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeContainer(row as DatabaseRow),
  );
};

export const getContainerById = async (
  id: string,
): Promise<ContainerTerminal> => {
  await ensureAuthenticated();
  return getContainerByIdInternal(id);
};

export const getContainerByNumber = async (
  numeroContainer: string,
): Promise<ContainerTerminal | null> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('containers_terminal')
    .select('*')
    .eq('numero_container', normalizeContainerNumber(numeroContainer))
    .neq('status', 'Saiu')
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? normalizeContainer(data as DatabaseRow) : null;
};

export const createContainerFromMovement = async (
  input: CriarContainerInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const numeroContainer = normalizeContainerNumber(input.numeroContainer);

  if (!numeroContainer) throw new Error('Informe o número do contêiner.');

  const existingContainer = await getContainerByNumber(numeroContainer);

  if (existingContainer) {
    throw new Error(
      `O contêiner ${numeroContainer} já está ativo no terminal.`,
    );
  }

  const { data, error } = await supabase
    .from('containers_terminal')
    .insert([
      {
        numero_container: numeroContainer,
        unidade: input.unidade,
        cliente: input.cliente?.trim() || null,
        armador: input.armador?.trim() || null,
        tipo_container: input.tipoContainer?.trim() || null,
        condicao: input.condicao ?? 'Não Informado',

        // O AGP registra a entrada sem definir endereço físico.
        status: 'Recebido' as StatusContainer,
        patio: null,
        quadra_id: null,
        quadra: null,
        pilha: null,
        fila: null,
        altura: null,
        posicao: null,

        quadra_reservada_id: null,
        patio_reservado: null,
        quadra_reservada: null,
        pilha_reservada: null,
        fila_reservada: null,
        altura_reservada: null,
        posicao_reservada: null,
        reservado_em: null,
        reservado_por: null,
        observacao_reserva: null,

        movimento_entrada_id: input.movimentoEntradaId ?? null,
        movimento_atual_id: input.movimentoEntradaId ?? null,
        placa_entrada: input.placaEntrada?.trim().toUpperCase() || null,
        placa_atual: input.placaEntrada?.trim().toUpperCase() || null,
        observacoes: input.observacoes?.trim() || null,
        criado_por: user.id,
        atualizado_por: user.id,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  const container = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container,
    movimentoId: input.movimentoEntradaId ?? null,
    tipoEvento: 'Recebimento',
    statusAnterior: null,
    statusNovo: 'Recebido',
    placaCavalo: input.placaEntrada ?? null,
    motivo:
      'Entrada registrada pelo AGP e encaminhada para definição de posição',
    observacao:
      input.observacoes?.trim() ||
      'Contêiner aguardando posicionamento pelo conferente.',
  });

  return container;
};

export const confirmContainerUnmount = async (
  input: DesmontarContainerInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);

  if (container.status === 'Saiu') {
    throw new Error('Não é possível desmontar um contêiner que já saiu.');
  }

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      status: 'Desmontado',
      movimento_atual_id: null,
      placa_atual: null,
      desmontado_em: new Date().toISOString(),
      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId:
      input.movimentoId ??
      container.movimentoAtualId ??
      container.movimentoEntradaId ??
      null,
    tipoEvento: 'Desmontagem',
    statusAnterior: container.status,
    statusNovo: 'Desmontado',
    patioAnterior: container.patio ?? null,
    pilhaAnterior: container.pilha ?? null,
    filaAnterior: container.fila ?? null,
    alturaAnterior: container.altura ?? null,
    posicaoAnterior: container.posicao ?? null,
    placaCavalo: container.placaAtual ?? container.placaEntrada ?? null,
    motivo: 'Contêiner desmontado do veículo',
    observacao: input.observacao,
  });

  return updatedContainer;
};


export const reserveContainerPosition = async (
  input: ReservarPosicaoContainerInput,
): Promise<ContainerTerminal> => {
  await ensureAuthenticated();

  const container = await getContainerByIdInternal(input.containerId);

  if (container.status === 'Saiu') {
    throw new Error(
      'Não é possível reservar posição para um contêiner que já saiu.',
    );
  }

  const quadraSelecionada = await validarQuadraParaArmazenamento(
    input.quadraId,
  );

  if (quadraSelecionada.unidade !== input.unidade) {
    throw new Error(
      `A quadra selecionada pertence à unidade ${quadraSelecionada.unidade}.`,
    );
  }

  const pilha = normalizeSlotPart(input.pilha);
  const fila = normalizeSlotPart(input.fila);
  const altura = Number(input.altura);

  if (!pilha || pilha === '00') {
    throw new Error('Informe uma pilha válida.');
  }

  if (!fila || fila === '00') {
    throw new Error('Informe uma fila válida.');
  }

  if (!Number.isInteger(altura) || altura < 1 || altura > 6) {
    throw new Error('A altura deve estar entre 1 e 6.');
  }

  const patio =
    input.patio?.trim() || quadraSelecionada.patioNome;
  const quadra =
    input.quadra?.trim() || quadraSelecionada.nome;
  const posicaoReservada = buildPatioPosition(
    pilha,
    fila,
    altura,
  );

  if (!posicaoReservada) {
    throw new Error('Não foi possível montar a posição reservada.');
  }

  const { data, error } = await supabase.rpc(
    'reservar_posicao_container',
    {
      p_container_id: container.id,
      p_unidade: input.unidade,
      p_patio: patio,
      p_quadra_id: input.quadraId,
      p_quadra: quadra,
      p_pilha: pilha,
      p_fila: fila,
      p_altura: altura,
      p_posicao: posicaoReservada,
      p_observacao: input.observacao?.trim() || null,
    },
  );

  if (error) {
    const message =
      error.message ||
      'Não foi possível reservar a posição selecionada.';

    if (
      message.toLowerCase().includes('ocupada') ||
      message.toLowerCase().includes('reservada')
    ) {
      throw new Error(message);
    }

    throw new Error(`Falha ao reservar posição: ${message}`);
  }

  const returnedRow = Array.isArray(data) ? data[0] : data;

  if (!returnedRow) {
    throw new Error(
      'A reserva foi processada, mas o banco não retornou o contêiner atualizado.',
    );
  }

  const updatedContainer = normalizeContainer(
    returnedRow as DatabaseRow,
  );

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: container.movimentoAtualId ?? null,
    tipoEvento: 'Movimentação',
    statusAnterior: container.status,
    statusNovo: container.status,
    patioAnterior: container.patio ?? null,
    pilhaAnterior: container.pilha ?? null,
    filaAnterior: container.fila ?? null,
    alturaAnterior: container.altura ?? null,
    posicaoAnterior: container.posicao ?? null,
    patioNovo: patio,
    pilhaNova: pilha,
    filaNova: fila,
    alturaNova: altura,
    posicaoNova: posicaoReservada,
    motivo: 'Reserva de posição pelo conferente',
    observacao:
      input.observacao?.trim() ||
      `Destino reservado em ${posicaoReservada}. Aguardando execução do operador.`,
  });

  return updatedContainer;
};

export const cancelContainerReservation = async (
  input: CancelarReservaContainerInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);
  const reservation = container as ContainerTerminal &
    Record<string, unknown>;

  const reservedPosition = normalizeOptionalText(
    reservation.posicaoReservada,
  );

  if (!reservedPosition) {
    throw new Error('Este contêiner não possui uma posição reservada.');
  }

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      quadra_reservada_id: null,
      patio_reservado: null,
      quadra_reservada: null,
      pilha_reservada: null,
      fila_reservada: null,
      altura_reservada: null,
      posicao_reservada: null,
      reservado_em: null,
      reservado_por: null,
      observacao_reserva: null,
      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: container.movimentoAtualId ?? null,
    tipoEvento: 'Movimentação',
    statusAnterior: container.status,
    statusNovo: container.status,
    posicaoAnterior: reservedPosition,
    motivo: input.motivo ?? 'Reserva cancelada',
    observacao:
      input.observacao?.trim() ||
      'A reserva de posição foi cancelada.',
  });

  return updatedContainer;
};

export const confirmReservedContainerExecution = async (
  input: ConfirmarExecucaoReservaInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);
  const reservation = container as ContainerTerminal &
    Record<string, unknown>;

  const quadraId = normalizeOptionalText(
    reservation.quadraReservadaId,
  );
  const patio = normalizeOptionalText(
    reservation.patioReservado,
  );
  const quadra = normalizeOptionalText(
    reservation.quadraReservada,
  );
  const pilha = normalizeOptionalText(
    reservation.pilhaReservada,
  );
  const fila = normalizeOptionalText(
    reservation.filaReservada,
  );
  const altura = normalizeOptionalNumber(
    reservation.alturaReservada,
  );
  const posicaoReservada = normalizeOptionalText(
    reservation.posicaoReservada,
  );

  if (
    !quadraId ||
    !patio ||
    !quadra ||
    !pilha ||
    !fila ||
    !altura ||
    !posicaoReservada
  ) {
    throw new Error(
      'O contêiner não possui uma reserva completa para execução.',
    );
  }

  const quadraSelecionada = await validarQuadraParaArmazenamento(
    quadraId,
  );

  await ensurePositionAvailable({
    containerId: container.id,
    quadraId,
    pilha,
    fila,
    altura,
  });

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      unidade: quadraSelecionada.unidade,
      patio,
      quadra_id: quadraId,
      quadra,
      pilha,
      fila,
      altura,
      posicao: posicaoReservada,
      status: 'Na Pilha',
      movimento_atual_id: null,
      placa_atual: null,

      quadra_reservada_id: null,
      patio_reservado: null,
      quadra_reservada: null,
      pilha_reservada: null,
      fila_reservada: null,
      altura_reservada: null,
      posicao_reservada: null,
      reservado_em: null,
      reservado_por: null,
      observacao_reserva: null,

      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `A posição ${posicaoReservada} foi ocupada por outro contêiner. O conferente deve reservar um novo destino.`,
      );
    }

    throw new Error(error.message);
  }

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: container.movimentoAtualId ?? null,
    tipoEvento: 'Armazenamento',
    statusAnterior: container.status,
    statusNovo: 'Na Pilha',
    patioAnterior: container.patio ?? null,
    pilhaAnterior: container.pilha ?? null,
    filaAnterior: container.fila ?? null,
    alturaAnterior: container.altura ?? null,
    posicaoAnterior: container.posicao ?? null,
    patioNovo: patio,
    pilhaNova: pilha,
    filaNova: fila,
    alturaNova: altura,
    posicaoNova: posicaoReservada,
    motivo: 'Execução confirmada pelo operador',
    observacao:
      input.observacao?.trim() ||
      `Armazenamento executado na posição ${posicaoReservada}.`,
  });

  return updatedContainer;
};

export const moveContainerToStack = async (
  input: MovimentarContainerComQuadraInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);

  if (container.status === 'Saiu') {
    throw new Error('Não é possível movimentar um contêiner que já saiu.');
  }

  if (!input.quadraId) {
    throw new Error('Selecione a quadra de armazenamento.');
  }

  const quadraSelecionada = await validarQuadraParaArmazenamento(
    input.quadraId,
  );

  if (quadraSelecionada.unidade !== input.unidade) {
    throw new Error(
      `A quadra selecionada pertence à unidade ${quadraSelecionada.unidade}.`,
    );
  }

  const pilha = normalizeSlotPart(input.pilha);
  const fila = normalizeSlotPart(input.fila);
  const altura = Number(input.altura);

  if (!pilha || pilha === '00') throw new Error('Informe uma pilha válida.');
  if (!fila || fila === '00') throw new Error('Informe uma fila válida.');

  if (!Number.isInteger(altura) || altura < 1 || altura > 6) {
    throw new Error('A altura deve estar entre 1 e 6.');
  }

  await ensurePositionAvailable({
    containerId: container.id,
    quadraId: input.quadraId,
    pilha,
    fila,
    altura,
  });

  const posicao = buildPatioPosition(pilha, fila, altura);

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      unidade: input.unidade,
      patio: input.patio?.trim() || quadraSelecionada.patioNome,
      quadra_id: input.quadraId,
      quadra: input.quadra?.trim() || quadraSelecionada.nome,
      pilha,
      fila,
      altura,
      posicao,
      status: 'Na Pilha',
      movimento_atual_id: null,
      placa_atual: null,

      quadra_reservada_id: null,
      patio_reservado: null,
      quadra_reservada: null,
      pilha_reservada: null,
      fila_reservada: null,
      altura_reservada: null,
      posicao_reservada: null,
      reservado_em: null,
      reservado_por: null,
      observacao_reserva: null,

      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `A posição ${posicao} foi ocupada por outro contêiner. Atualize a tela e escolha outra posição.`,
      );
    }

    throw new Error(error.message);
  }

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: input.movimentoId ?? null,
    tipoEvento:
      container.posicao || container.pilha
        ? 'Movimentação'
        : 'Armazenamento',
    statusAnterior: container.status,
    statusNovo: 'Na Pilha',
    patioAnterior: container.patio ?? null,
    pilhaAnterior: container.pilha ?? null,
    filaAnterior: container.fila ?? null,
    alturaAnterior: container.altura ?? null,
    posicaoAnterior: container.posicao ?? null,
    patioNovo: quadraSelecionada.patioNome,
    pilhaNova: updatedContainer.pilha ?? null,
    filaNova: updatedContainer.fila ?? null,
    alturaNova: updatedContainer.altura ?? null,
    posicaoNova: updatedContainer.posicao ?? null,
    motivo: input.motivo,
    observacao: input.observacao,
  });

  return updatedContainer;
};

export const scheduleContainerExit = async (
  input: ProgramarSaidaInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);

  if (container.status === 'Saiu') {
    throw new Error('Não é possível programar um contêiner que já saiu.');
  }

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      status: 'Programado para Saída',
      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: input.movimentoId ?? null,
    tipoEvento: 'Programação de Saída',
    statusAnterior: container.status,
    statusNovo: 'Programado para Saída',
    patioAnterior: container.patio ?? null,
    pilhaAnterior: container.pilha ?? null,
    filaAnterior: container.fila ?? null,
    alturaAnterior: container.altura ?? null,
    posicaoAnterior: container.posicao ?? null,
    patioNovo: container.patio ?? null,
    pilhaNova: container.pilha ?? null,
    filaNova: container.fila ?? null,
    alturaNova: container.altura ?? null,
    posicaoNova: container.posicao ?? null,
    motivo: input.motivo ?? 'Programação de saída',
    observacao: input.observacao,
  });

  return updatedContainer;
};

export const mountContainerOnVehicle = async (
  input: MontarContainerInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);

  if (container.status === 'Saiu') {
    throw new Error('Não é possível montar um contêiner que já saiu.');
  }

  if (!input.movimentoId) {
    throw new Error('Selecione o veículo que receberá o contêiner.');
  }

  if (!input.placaCavalo.trim()) {
    throw new Error('Informe a placa do veículo.');
  }

  const placaCavalo = input.placaCavalo.trim().toUpperCase();
  const placaCarreta =
    input.placaCarreta?.trim().toUpperCase() || null;

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      status: 'Montado',
      condicao: input.condicaoSaida,
      movimento_atual_id: input.movimentoId,
      placa_atual: placaCavalo,
      patio: null,
      quadra_id: null,
      quadra: null,
      pilha: null,
      fila: null,
      altura: null,
      posicao: null,

      quadra_reservada_id: null,
      patio_reservado: null,
      quadra_reservada: null,
      pilha_reservada: null,
      fila_reservada: null,
      altura_reservada: null,
      posicao_reservada: null,
      reservado_em: null,
      reservado_por: null,
      observacao_reserva: null,

      montado_em: new Date().toISOString(),
      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: input.movimentoId,
    tipoEvento: 'Montagem',
    statusAnterior: container.status,
    statusNovo: 'Montado',
    patioAnterior: container.patio ?? null,
    pilhaAnterior: container.pilha ?? null,
    filaAnterior: container.fila ?? null,
    alturaAnterior: container.altura ?? null,
    posicaoAnterior: container.posicao ?? null,
    placaCavalo,
    placaCarreta,
    motivo: 'Contêiner montado no veículo',
    observacao: input.observacao,
  });

  return updatedContainer;
};

export const finalizeContainerExit = async (
  input: FinalizarSaidaContainerInput,
): Promise<ContainerTerminal> => {
  const user = await ensureAuthenticated();
  const container = await getContainerByIdInternal(input.containerId);

  if (container.status === 'Saiu') {
    throw new Error('Este contêiner já teve sua saída registrada.');
  }

  if (container.movimentoAtualId !== input.movimentoId) {
    throw new Error(
      'O contêiner não está vinculado ao movimento informado.',
    );
  }

  const placaCavalo = input.placaCavalo.trim().toUpperCase();
  const placaCarreta =
    input.placaCarreta?.trim().toUpperCase() || null;

  const { data, error } = await supabase
    .from('containers_terminal')
    .update({
      status: 'Saiu',
      movimento_saida_id: input.movimentoId,
      movimento_atual_id: null,
      placa_saida: placaCavalo,
      placa_atual: null,
      saida_em: new Date().toISOString(),
      atualizado_por: user.id,
    })
    .eq('id', container.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updatedContainer = normalizeContainer(data as DatabaseRow);

  await registerContainerEvent({
    container: updatedContainer,
    movimentoId: input.movimentoId,
    tipoEvento: 'Saída',
    statusAnterior: container.status,
    statusNovo: 'Saiu',
    placaCavalo,
    placaCarreta,
    motivo: 'Saída confirmada pela portaria',
    observacao: input.observacao,
  });

  return updatedContainer;
};

export const getContainerTimeline = async (
  containerId: string,
): Promise<EventoContainer[]> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from('eventos_container')
    .select('*')
    .eq('container_id', containerId)
    .order('criado_em', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeEvent(row as DatabaseRow),
  );
};

export const subscribeToContainers = (callback: () => void) => {
  const channel = supabase.channel(
    `containers-terminal-realtime-${crypto.randomUUID()}`,
  );

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'containers_terminal',
    },
    callback,
  );

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'eventos_container',
    },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};