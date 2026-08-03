import { createContainerFromMovement } from "@/lib/containers";
import { createMovement } from "@/lib/movements";
import { supabase } from "@/lib/supabase";
import type {
  Agendamento,
  ConfirmarAgendamentoInput,
  CriarAgendamentoInput,
  OrigemAgendamento,
  StatusAgendamento,
  TipoAcesso,
  TipoAgendamento,
  VehicleMovement,
} from "@/types";

const ensureAuthenticated = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return session.user;
};

const textOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const normalizeAgendamento = (
  row: Record<string, unknown>,
): Agendamento => ({
  id: String(row.id ?? ""),
  tipo: String(row.tipo ?? "Outro") as TipoAgendamento,
  status: String(row.status ?? "Agendado") as StatusAgendamento,
  origem: String(row.origem ?? "Manual") as OrigemAgendamento,

  unidade: String(row.unidade ?? "JAV 1"),
  portaria: textOrNull(row.portaria) ?? undefined,

  dataPrevista: String(row.data_prevista ?? ""),
  janelaInicio: textOrNull(row.janela_inicio),
  janelaFim: textOrNull(row.janela_fim),

  placaCavalo: textOrNull(row.placa_cavalo),
  placaCarreta: textOrNull(row.placa_carreta),
  motorista: textOrNull(row.motorista),
  telefone: textOrNull(row.telefone),
  transportadora: textOrNull(row.transportadora),

  cliente: textOrNull(row.cliente),
  operacao: textOrNull(row.operacao),
  destino: textOrNull(row.destino),

  numeroContainer: textOrNull(row.numero_container),
  lacre: textOrNull(row.lacre),
  armador: textOrNull(row.armador),
  tipoContainer: textOrNull(row.tipo_container),
  condicao: row.condicao
    ? (String(row.condicao) as Agendamento["condicao"])
    : null,

  possuiContainer:
    row.possui_container === null ||
    row.possui_container === undefined
      ? null
      : Boolean(row.possui_container),

  motivoSemContainer: row.motivo_sem_container
    ? (String(
        row.motivo_sem_container,
      ) as Agendamento["motivoSemContainer"])
    : null,

  justificativaSemContainer: textOrNull(
    row.justificativa_sem_container,
  ),

  nomeVisitante: textOrNull(row.nome_visitante),
  documentoVisitante: textOrNull(row.documento_visitante),
  empresaVisitante: textOrNull(row.empresa_visitante),
  pessoaVisitada: textOrNull(row.pessoa_visitada),
  motivoVisita: textOrNull(row.motivo_visita),

  nomePedestre: textOrNull(row.nome_pedestre),
  documentoPedestre: textOrNull(row.documento_pedestre),
  finalidadePedestre: textOrNull(row.finalidade_pedestre),

  tipoMaterial: textOrNull(row.tipo_material),
  descricaoMaterial: textOrNull(row.descricao_material),
  numeroNotaFiscal: textOrNull(row.numero_nota_fiscal),
  setorDestino: textOrNull(row.setor_destino),
  responsavelRecebimento: textOrNull(
    row.responsavel_recebimento,
  ),

  descricaoOutro: textOrNull(row.descricao_outro),
  observacoes: textOrNull(row.observacoes),

  fotoVeiculo: textOrNull(row.foto_veiculo),
  fotoContainer: textOrNull(row.foto_container),
  fotoDocumento: textOrNull(row.foto_documento),
  fotoVisitante: textOrNull(row.foto_visitante),
  fotoMaterial: textOrNull(row.foto_material),
  fotoNotaFiscal: textOrNull(row.foto_nota_fiscal),

  movimentoId: textOrNull(row.movimento_id),

  criadoPor: textOrNull(row.criado_por),
  confirmadoPor: textOrNull(row.confirmado_por),
  canceladoPor: textOrNull(row.cancelado_por),

  criadoEm: textOrNull(row.criado_em) ?? undefined,
  atualizadoEm: textOrNull(row.atualizado_em) ?? undefined,
  confirmadoEm: textOrNull(row.confirmado_em),
  canceladoEm: textOrNull(row.cancelado_em),
});

const toDatabasePayload = (input: CriarAgendamentoInput) => ({
  tipo: input.tipo,
  status: input.status ?? "Agendado",
  origem: input.origem ?? "Manual",

  unidade: input.unidade,
  portaria: input.portaria ?? null,

  data_prevista: input.dataPrevista,
  janela_inicio: input.janelaInicio ?? null,
  janela_fim: input.janelaFim ?? null,

  placa_cavalo: input.placaCavalo ?? null,
  placa_carreta: input.placaCarreta ?? null,
  motorista: input.motorista ?? null,
  telefone: input.telefone ?? null,
  transportadora: input.transportadora ?? null,

  cliente: input.cliente ?? null,
  operacao: input.operacao ?? null,
  destino: input.destino ?? null,

  numero_container: input.numeroContainer ?? null,
  lacre: input.lacre ?? null,
  armador: input.armador ?? null,
  tipo_container: input.tipoContainer ?? null,
  condicao: input.condicao ?? null,

  possui_container: input.possuiContainer ?? null,
  motivo_sem_container: input.motivoSemContainer ?? null,
  justificativa_sem_container:
    input.justificativaSemContainer ?? null,

  nome_visitante: input.nomeVisitante ?? null,
  documento_visitante: input.documentoVisitante ?? null,
  empresa_visitante: input.empresaVisitante ?? null,
  pessoa_visitada: input.pessoaVisitada ?? null,
  motivo_visita: input.motivoVisita ?? null,

  nome_pedestre: input.nomePedestre ?? null,
  documento_pedestre: input.documentoPedestre ?? null,
  finalidade_pedestre: input.finalidadePedestre ?? null,

  tipo_material: input.tipoMaterial ?? null,
  descricao_material: input.descricaoMaterial ?? null,
  numero_nota_fiscal: input.numeroNotaFiscal ?? null,
  setor_destino: input.setorDestino ?? null,
  responsavel_recebimento:
    input.responsavelRecebimento ?? null,

  descricao_outro: input.descricaoOutro ?? null,
  observacoes: input.observacoes ?? null,
});

const mapTipoAcesso = (tipo: TipoAgendamento): TipoAcesso => {
  switch (tipo) {
    case "Caminhão com Contêiner":
    case "Caminhão sem Contêiner":
      return "Caminhão Operacional";
    case "Entrega de Material":
      return "Entrega de Material";
    case "Veículo Leve":
      return "Veículo Leve";
    case "Visitante":
    case "Pedestre":
      return "Visitante";
    case "Prestador de Serviço":
    case "Manutenção":
      return "Prestador de Serviço";
    default:
      return "Outro";
  }
};

const buildMovementInput = (
  agendamento: Agendamento,
  input: ConfirmarAgendamentoInput,
) => {
  const tipoAcesso = mapTipoAcesso(agendamento.tipo);
  const isCaminhao =
    agendamento.tipo === "Caminhão com Contêiner" ||
    agendamento.tipo === "Caminhão sem Contêiner";

  const isSemContainer =
    agendamento.tipo === "Caminhão sem Contêiner";

  const isMontagem =
    isSemContainer &&
    agendamento.motivoSemContainer ===
      "Montagem de Contêiner";

  const nomePessoa =
    agendamento.nomeVisitante ??
    agendamento.nomePedestre ??
    input.motorista ??
    agendamento.motorista ??
    "";

  return {
    unidade: agendamento.unidade,
    tipoAcesso,
    portariaEntrada: input.portariaEntrada,

    placaCavalo:
      input.placaCavalo ??
      agendamento.placaCavalo ??
      "",
    placaCarreta:
      input.placaCarreta ??
      agendamento.placaCarreta ??
      "",

    motorista: isCaminhao
      ? input.motorista ??
        agendamento.motorista ??
        ""
      : nomePessoa,

    telefone:
      input.telefone ??
      agendamento.telefone ??
      "",

    transportadora:
      input.transportadora ??
      agendamento.transportadora ??
      agendamento.empresaVisitante ??
      "",

    cliente: agendamento.cliente ?? "",
    operacao:
      agendamento.operacao ??
      agendamento.motivoVisita ??
      agendamento.finalidadePedestre ??
      agendamento.descricaoOutro ??
      agendamento.tipo,

    numeroContainer:
      agendamento.numeroContainer ?? "",
    lacre: agendamento.lacre ?? "",
    armador: agendamento.armador ?? "",
    tipoContainer: agendamento.tipoContainer ?? "",
    condicao: agendamento.condicao ?? undefined,

    nomeVisitante:
      agendamento.nomeVisitante ??
      agendamento.nomePedestre ??
      undefined,

    documentoVisitante:
      agendamento.documentoVisitante ??
      agendamento.documentoPedestre ??
      undefined,

    empresaVisitante:
      agendamento.empresaVisitante ?? undefined,

    pessoaVisitada:
      agendamento.pessoaVisitada ?? undefined,

    motivoVisita:
      agendamento.motivoVisita ??
      agendamento.finalidadePedestre ??
      undefined,

    tipoMaterial:
      agendamento.tipoMaterial ?? undefined,

    descricaoMaterial:
      agendamento.descricaoMaterial ?? undefined,

    numeroNotaFiscal:
      agendamento.numeroNotaFiscal ?? undefined,

    setorDestino:
      agendamento.setorDestino ??
      agendamento.destino ??
      undefined,

    responsavelRecebimento:
      agendamento.responsavelRecebimento ?? undefined,

    observacoes: [
      agendamento.observacoes,
      input.observacoes,
      `Agendamento ${agendamento.id}`,
    ]
      .filter(Boolean)
      .join(" | "),

    motivoEntradaSemContainer:
      isSemContainer
        ? agendamento.motivoSemContainer
        : null,

    justificativaEntrada:
      isSemContainer
        ? agendamento.justificativaSemContainer
        : null,

    exigeFilaOperacional: isMontagem,
    etapaOperacional: isMontagem
      ? "AGUARDANDO_CONFERENTE"
      : null,

    files: {
      fotoVeiculo: input.fotoVeiculo ?? null,
      fotoContainer: input.fotoContainer ?? null,
      fotoDocumento: input.fotoDocumento ?? null,
      fotoVisitante: input.fotoVisitante ?? null,
      fotoMaterial: input.fotoMaterial ?? null,
      fotoNotaFiscal: input.fotoNotaFiscal ?? null,
    },
  };
};

export const listarAgendamentos = async (): Promise<
  Agendamento[]
> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .order("data_prevista", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeAgendamento(row as Record<string, unknown>),
  );
};

export const buscarAgendamentoPorId = async (
  id: string,
): Promise<Agendamento | null> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data
    ? normalizeAgendamento(
        data as Record<string, unknown>,
      )
    : null;
};

export const criarAgendamento = async (
  input: CriarAgendamentoInput,
): Promise<Agendamento> => {
  const user = await ensureAuthenticated();

  const { data, error } = await supabase
    .from("agendamentos")
    .insert([
      {
        ...toDatabasePayload(input),
        criado_por: user.id,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeAgendamento(
    data as Record<string, unknown>,
  );
};

export const atualizarAgendamento = async (
  id: string,
  input: Partial<CriarAgendamentoInput>,
): Promise<Agendamento> => {
  await ensureAuthenticated();

  const payload = Object.fromEntries(
    Object.entries(
      toDatabasePayload({
        tipo: input.tipo ?? "Outro",
        status: input.status,
        origem: input.origem ?? "Manual",
        unidade: input.unidade ?? "JAV 1",
        dataPrevista:
          input.dataPrevista ??
          new Date().toISOString(),
        ...input,
      } as CriarAgendamentoInput),
    ).filter(([, value]) => value !== undefined),
  );

  const { data, error } = await supabase
    .from("agendamentos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeAgendamento(
    data as Record<string, unknown>,
  );
};

export const iniciarRecepcaoAgendamento = async (
  id: string,
): Promise<Agendamento> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: "Em Recepção" })
    .eq("id", id)
    .eq("status", "Agendado")
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeAgendamento(
    data as Record<string, unknown>,
  );
};

export const confirmarAgendamento = async (
  input: ConfirmarAgendamentoInput,
): Promise<{
  agendamento: Agendamento;
  movimentacao: VehicleMovement;
}> => {
  const user = await ensureAuthenticated();

  const agendamento = await buscarAgendamentoPorId(
    input.agendamentoId,
  );

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.");
  }

  if (agendamento.status === "Recebido") {
    throw new Error(
      "Este agendamento já foi confirmado anteriormente.",
    );
  }

  if (agendamento.status === "Cancelado") {
    throw new Error(
      "Não é possível confirmar um agendamento cancelado.",
    );
  }

  const movimentacao = await createMovement(
    buildMovementInput(agendamento, input),
  );

  if (agendamento.numeroContainer) {
    try {
      await createContainerFromMovement({
        numeroContainer: agendamento.numeroContainer,
        unidade: agendamento.unidade,
        cliente: agendamento.cliente ?? undefined,
        armador: agendamento.armador ?? undefined,
        tipoContainer: agendamento.tipoContainer ?? undefined,
        condicao: agendamento.condicao ?? "Não Informado",
        movimentoEntradaId: movimentacao.id,
        placaEntrada:
          input.placaCavalo ??
          agendamento.placaCavalo ??
          movimentacao.placaCavalo ??
          "",
        observacoes: [
          agendamento.observacoes,
          input.observacoes,
          `Criado automaticamente a partir do agendamento ${agendamento.id}`,
        ]
          .filter(Boolean)
          .join(" | "),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao criar o contêiner.";

      throw new Error(
        `A movimentação foi criada, mas o contêiner não foi registrado: ${message}`,
      );
    }
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      status: "Recebido",
      movimento_id: movimentacao.id,
      confirmado_por: user.id,
      confirmado_em: now,
      portaria: input.portariaEntrada,
      placa_cavalo:
        input.placaCavalo ??
        agendamento.placaCavalo,
      placa_carreta:
        input.placaCarreta ??
        agendamento.placaCarreta,
      motorista:
        input.motorista ??
        agendamento.motorista,
      telefone:
        input.telefone ??
        agendamento.telefone,
      transportadora:
        input.transportadora ??
        agendamento.transportadora,
      observacoes: [
        agendamento.observacoes,
        input.observacoes,
      ]
        .filter(Boolean)
        .join(" | "),
    })
    .eq("id", agendamento.id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `A movimentação foi criada, mas o agendamento não foi finalizado: ${error.message}`,
    );
  }

  return {
    agendamento: normalizeAgendamento(
      data as Record<string, unknown>,
    ),
    movimentacao,
  };
};

export const cancelarAgendamento = async (
  id: string,
  motivo?: string,
): Promise<Agendamento> => {
  const user = await ensureAuthenticated();
  const now = new Date().toISOString();

  const atual = await buscarAgendamentoPorId(id);

  if (!atual) {
    throw new Error("Agendamento não encontrado.");
  }

  if (atual.status === "Recebido") {
    throw new Error(
      "Um agendamento já recebido não pode ser cancelado.",
    );
  }

  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      status: "Cancelado",
      cancelado_por: user.id,
      cancelado_em: now,
      observacoes: [atual.observacoes, motivo]
        .filter(Boolean)
        .join(" | "),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeAgendamento(
    data as Record<string, unknown>,
  );
};

export const marcarNaoCompareceu = async (
  id: string,
): Promise<Agendamento> => {
  await ensureAuthenticated();

  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: "Não Compareceu" })
    .eq("id", id)
    .in("status", ["Agendado", "Em Recepção"])
    .select()
    .single();

  if (error) throw new Error(error.message);

  return normalizeAgendamento(
    data as Record<string, unknown>,
  );
};

export const subscribeToAgendamentos = (
  callback: () => void,
) => {
  const channel = supabase.channel(
    `agendamentos-realtime-${crypto.randomUUID()}`,
  );

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "agendamentos",
    },
    callback,
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};