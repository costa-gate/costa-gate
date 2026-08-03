import { getContainerTimeline } from "@/lib/containers";
import { supabase } from "@/lib/supabase";
import type {
  CondicaoContainer,
  EventoContainer,
  StatusContainer,
  Unidade,
} from "@/types";

type DatabaseRow = Record<string, unknown>;

export type EtapaUnificadaContainer =
  | "RECEBIDO"
  | "AGUARDANDO_CONFERENTE"
  | "DESTINO_RESERVADO"
  | "AGUARDANDO_OPERADOR"
  | "NA_PILHA"
  | "PROGRAMADO_PARA_SAIDA"
  | "MONTADO"
  | "SAIU";

export type ContainerUnifiedView = {
  id: string;
  numeroContainer: string;
  unidade: Unidade;
  cliente?: string | null;
  armador?: string | null;
  tipoContainer?: string | null;
  condicao: CondicaoContainer;
  status: StatusContainer;
  etapa: EtapaUnificadaContainer;
  operacao?: string | null;
  destino?: string | null;
  patio?: string | null;
  quadraId?: string | null;
  quadra?: string | null;
  pilha?: string | null;
  fila?: string | null;
  altura?: number | null;
  posicao?: string | null;
  patioReservado?: string | null;
  quadraReservadaId?: string | null;
  quadraReservada?: string | null;
  pilhaReservada?: string | null;
  filaReservada?: string | null;
  alturaReservada?: number | null;
  posicaoReservada?: string | null;
  reservadoEm?: string | null;
  observacaoReserva?: string | null;
  movimentoEntradaId?: string | null;
  movimentoAtualId?: string | null;
  movimentoSaidaId?: string | null;
  placaEntrada?: string | null;
  placaAtual?: string | null;
  placaSaida?: string | null;
  placaCarreta?: string | null;
  motorista?: string | null;
  transportadora?: string | null;
  entradaEm: string;
  desmontadoEm?: string | null;
  montadoEm?: string | null;
  saidaEm?: string | null;
  observacoes?: string | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
};

const ensureAuthenticated = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);
  if (!session) throw new Error("Sessão expirada. Faça login novamente.");

  return session.user;
};

const textOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
};

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveEtapa = (row: DatabaseRow): EtapaUnificadaContainer => {
  const status = String(row.status ?? "Recebido");
  const possuiReserva = Boolean(textOrNull(row.posicao_reservada));
  const possuiPosicao = Boolean(textOrNull(row.quadra_id));

  if (status === "Saiu") return "SAIU";
  if (status === "Montado") return "MONTADO";
  if (status === "Programado para Saída") return "PROGRAMADO_PARA_SAIDA";
  if (status === "Na Pilha" || possuiPosicao) return "NA_PILHA";
  if (possuiReserva) return "AGUARDANDO_OPERADOR";

  if (
    status === "Recebido" ||
    status === "Desmontado" ||
    status === "Aguardando Desmontagem"
  ) {
    return "AGUARDANDO_CONFERENTE";
  }

  return "RECEBIDO";
};

const normalizeUnifiedView = (
  row: DatabaseRow,
): ContainerUnifiedView => {
  const movement = (row.movimentacoes ?? {}) as DatabaseRow;

  return {
    id: String(row.id ?? ""),
    numeroContainer: String(row.numero_container ?? ""),
    unidade: String(row.unidade ?? "JAV 1"),
    cliente: textOrNull(row.cliente),
    armador: textOrNull(row.armador),
    tipoContainer: textOrNull(row.tipo_container),
    condicao: String(row.condicao ?? "Não Informado") as CondicaoContainer,
    status: String(row.status ?? "Recebido") as StatusContainer,
    etapa: resolveEtapa(row),
    operacao: textOrNull(movement.operacao),
    destino: textOrNull(movement.setor_destino),
    patio: textOrNull(row.patio),
    quadraId: textOrNull(row.quadra_id),
    quadra: textOrNull(row.quadra),
    pilha: textOrNull(row.pilha),
    fila: textOrNull(row.fila),
    altura: numberOrNull(row.altura),
    posicao: textOrNull(row.posicao),
    patioReservado: textOrNull(row.patio_reservado),
    quadraReservadaId: textOrNull(row.quadra_reservada_id),
    quadraReservada: textOrNull(row.quadra_reservada),
    pilhaReservada: textOrNull(row.pilha_reservada),
    filaReservada: textOrNull(row.fila_reservada),
    alturaReservada: numberOrNull(row.altura_reservada),
    posicaoReservada: textOrNull(row.posicao_reservada),
    reservadoEm: textOrNull(row.reservado_em),
    observacaoReserva: textOrNull(row.observacao_reserva),
    movimentoEntradaId: textOrNull(row.movimento_entrada_id),
    movimentoAtualId: textOrNull(row.movimento_atual_id),
    movimentoSaidaId: textOrNull(row.movimento_saida_id),
    placaEntrada: textOrNull(row.placa_entrada),
    placaAtual: textOrNull(row.placa_atual),
    placaSaida: textOrNull(row.placa_saida),
    placaCarreta: textOrNull(movement.placa_carreta),
    motorista: textOrNull(movement.motorista),
    transportadora: textOrNull(movement.transportadora),
    entradaEm: String(row.entrada_em ?? ""),
    desmontadoEm: textOrNull(row.desmontado_em),
    montadoEm: textOrNull(row.montado_em),
    saidaEm: textOrNull(row.saida_em),
    observacoes: textOrNull(row.observacoes),
    criadoEm: textOrNull(row.criado_em),
    atualizadoEm: textOrNull(row.atualizado_em),
  };
};

const unifiedSelect = `
  id,
  numero_container,
  unidade,
  cliente,
  armador,
  tipo_container,
  condicao,
  status,
  patio,
  quadra_id,
  quadra,
  pilha,
  fila,
  altura,
  posicao,
  patio_reservado,
  quadra_reservada_id,
  quadra_reservada,
  pilha_reservada,
  fila_reservada,
  altura_reservada,
  posicao_reservada,
  reservado_em,
  observacao_reserva,
  movimento_entrada_id,
  movimento_atual_id,
  movimento_saida_id,
  placa_entrada,
  placa_atual,
  placa_saida,
  entrada_em,
  desmontado_em,
  montado_em,
  saida_em,
  observacoes,
  criado_em,
  atualizado_em,
  movimentacoes:movimento_entrada_id (
    operacao,
    setor_destino,
    placa_carreta,
    motorista,
    transportadora
  )
`;

export const listarContainersUnificados = async (): Promise<
  ContainerUnifiedView[]
> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("containers_terminal")
    .select(unifiedSelect)
    .order("entrada_em", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeUnifiedView(row as DatabaseRow),
  );
};

export const listarContainersAtivosUnificados = async (): Promise<
  ContainerUnifiedView[]
> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("containers_terminal")
    .select(unifiedSelect)
    .neq("status", "Saiu")
    .order("entrada_em", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeUnifiedView(row as DatabaseRow),
  );
};

export const buscarContainerUnificadoPorId = async (
  id: string,
): Promise<ContainerUnifiedView | null> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("containers_terminal")
    .select(unifiedSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? normalizeUnifiedView(data as DatabaseRow) : null;
};

export const buscarContainerUnificadoPorNumero = async (
  numeroContainer: string,
): Promise<ContainerUnifiedView | null> => {
  await ensureAuthenticated();

  const normalized = numeroContainer.trim().toUpperCase().replace(/\s+/g, "");

  const { data, error } = await supabase
    .from("containers_terminal")
    .select(unifiedSelect)
    .eq("numero_container", normalized)
    .neq("status", "Saiu")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? normalizeUnifiedView(data as DatabaseRow) : null;
};

export const carregarContainerCompleto = async (
  id: string,
): Promise<{
  container: ContainerUnifiedView;
  timeline: EventoContainer[];
}> => {
  const container = await buscarContainerUnificadoPorId(id);

  if (!container) {
    throw new Error("Contêiner não encontrado.");
  }

  const timeline = await getContainerTimeline(id);

  return { container, timeline };
};

export const subscribeToContainerDomain = (
  callback: () => void,
) => {
  const channel = supabase.channel(
    `container-domain-${crypto.randomUUID()}`,
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "containers_terminal",
    },
    callback,
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "movimentacoes",
    },
    callback,
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "eventos_container",
    },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};