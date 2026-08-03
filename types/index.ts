export type Unidade = "JAV 1" | "JAV 2" | string;

export type Portaria =
  | "Portaria JAV 1"
  | "Portaria JAV 2"
  | string;

export type TipoAcesso =
  | "Caminhão Operacional"
  | "Entrega de Material"
  | "Veículo Leve"
  | "Visitante"
  | "Prestador de Serviço"
  | "Outro";

export type StatusMovimentacao =
  | "Na Portaria"
  | "Em Operação"
  | "Aguardando Saída"
  | "Finalizado"
  | string;

export type TipoSaidaVeiculo =
  | "Sem Contêiner"
  | "Com o Mesmo Contêiner"
  | "Com Outro Contêiner"
  | "Entrega Concluída"
  | "Visita Finalizada"
  | "Serviço Concluído"
  | "Outro";

export type CondicaoContainer =
  | "Cheio"
  | "Vazio"
  | "Não Informado";

export type StatusContainer =
  | "Recebido"
  | "Aguardando Desmontagem"
  | "Desmontado"
  | "Na Pilha"
  | "Em Movimentação"
  | "Aguardando Programação"
  | "Programado para Saída"
  | "Montado"
  | "Saiu";

export type TipoEventoContainer =
  | "Recebimento"
  | "Desmontagem"
  | "Armazenamento"
  | "Movimentação"
  | "Programação de Saída"
  | "Montagem"
  | "Saída"
  | "Cancelamento"
  | "Correção";

export type MotivoMovimentacaoContainer =
  | "Armazenamento inicial"
  | "Organização de pátio"
  | "Separação para entrega"
  | "Separação para coleta"
  | "Reposicionamento"
  | "Carregamento"
  | "Descarregamento"
  | "Inspeção"
  | "Outro";

/* =========================================================
 * AGENDAMENTOS
 * ======================================================= */

export type TipoAgendamento =
  | "Caminhão com Contêiner"
  | "Caminhão sem Contêiner"
  | "Entrega de Material"
  | "Veículo Leve"
  | "Visitante"
  | "Pedestre"
  | "Prestador de Serviço"
  | "Manutenção"
  | "Outro";

export type StatusAgendamento =
  | "Agendado"
  | "Em Recepção"
  | "Recebido"
  | "Cancelado"
  | "Não Compareceu";

export type OrigemAgendamento =
  | "Manual"
  | "Excel"
  | "Integração"
  | string;

export type MotivoEntradaSemContainer =
  | "Montagem de Contêiner"
  | "Estacionamento"
  | "Apoio Operacional"
  | "Espera"
  | "Outro";

export type Agendamento = {
  id: string;

  tipo: TipoAgendamento;
  status: StatusAgendamento;
  origem: OrigemAgendamento;

  unidade: Unidade;
  portaria?: Portaria;

  dataPrevista: string;
  janelaInicio?: string | null;
  janelaFim?: string | null;

  placaCavalo?: string | null;
  placaCarreta?: string | null;
  motorista?: string | null;
  telefone?: string | null;
  transportadora?: string | null;

  cliente?: string | null;
  operacao?: string | null;
  destino?: string | null;

  numeroContainer?: string | null;
  lacre?: string | null;
  armador?: string | null;
  tipoContainer?: string | null;
  condicao?: CondicaoContainer | null;

  possuiContainer?: boolean | null;
  motivoSemContainer?: MotivoEntradaSemContainer | null;
  justificativaSemContainer?: string | null;

  nomeVisitante?: string | null;
  documentoVisitante?: string | null;
  empresaVisitante?: string | null;
  pessoaVisitada?: string | null;
  motivoVisita?: string | null;

  nomePedestre?: string | null;
  documentoPedestre?: string | null;
  finalidadePedestre?: string | null;

  tipoMaterial?: string | null;
  descricaoMaterial?: string | null;
  numeroNotaFiscal?: string | null;
  setorDestino?: string | null;
  responsavelRecebimento?: string | null;

  descricaoOutro?: string | null;
  observacoes?: string | null;

  fotoVeiculo?: string | null;
  fotoContainer?: string | null;
  fotoDocumento?: string | null;
  fotoVisitante?: string | null;
  fotoMaterial?: string | null;
  fotoNotaFiscal?: string | null;

  movimentoId?: string | null;

  criadoPor?: string | null;
  confirmadoPor?: string | null;
  canceladoPor?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
  confirmadoEm?: string | null;
  canceladoEm?: string | null;
};

export type CriarAgendamentoInput = {
  tipo: TipoAgendamento;
  status?: StatusAgendamento;
  origem?: OrigemAgendamento;

  unidade: Unidade;
  portaria?: Portaria;

  dataPrevista: string;
  janelaInicio?: string | null;
  janelaFim?: string | null;

  placaCavalo?: string | null;
  placaCarreta?: string | null;
  motorista?: string | null;
  telefone?: string | null;
  transportadora?: string | null;

  cliente?: string | null;
  operacao?: string | null;
  destino?: string | null;

  numeroContainer?: string | null;
  lacre?: string | null;
  armador?: string | null;
  tipoContainer?: string | null;
  condicao?: CondicaoContainer | null;

  possuiContainer?: boolean | null;
  motivoSemContainer?: MotivoEntradaSemContainer | null;
  justificativaSemContainer?: string | null;

  nomeVisitante?: string | null;
  documentoVisitante?: string | null;
  empresaVisitante?: string | null;
  pessoaVisitada?: string | null;
  motivoVisita?: string | null;

  nomePedestre?: string | null;
  documentoPedestre?: string | null;
  finalidadePedestre?: string | null;

  tipoMaterial?: string | null;
  descricaoMaterial?: string | null;
  numeroNotaFiscal?: string | null;
  setorDestino?: string | null;
  responsavelRecebimento?: string | null;

  descricaoOutro?: string | null;
  observacoes?: string | null;
};

export type ConfirmarAgendamentoInput = {
  agendamentoId: string;
  portariaEntrada: Portaria;

  placaCavalo?: string | null;
  placaCarreta?: string | null;
  motorista?: string | null;
  telefone?: string | null;
  transportadora?: string | null;
  observacoes?: string | null;

  fotoVeiculo?: File | null;
  fotoContainer?: File | null;
  fotoDocumento?: File | null;
  fotoVisitante?: File | null;
  fotoMaterial?: File | null;
  fotoNotaFiscal?: File | null;
};

/* =========================================================
 * PÁTIO E MOVIMENTAÇÕES
 * ======================================================= */

export type PosicaoPatio = {
  unidade: Unidade;
  patio?: string;
  pilha?: string;
  fila?: string;
  altura?: number;
  posicao?: string;
};

export type VehicleMovement = {
  id: string;

  unidade: Unidade;
  tipoAcesso?: TipoAcesso;

  portariaEntrada?: Portaria;
  portariaSaida?: Portaria;

  placaCavalo: string;
  placaCarreta: string;

  motorista: string;
  telefone?: string;
  transportadora?: string;

  cliente: string;
  operacao: string;

  numeroContainer: string;
  lacre: string;
  armador?: string;
  tipoContainer?: string;
  condicao?: string;

  nomeVisitante?: string;
  documentoVisitante?: string;
  empresaVisitante?: string;
  pessoaVisitada?: string;
  motivoVisita?: string;

  tipoMaterial?: string;
  descricaoMaterial?: string;
  numeroNotaFiscal?: string;
  setorDestino?: string;
  responsavelRecebimento?: string;
  materialRecebido?: boolean;

  observacoes?: string;
  observacoesSaida?: string;

  fotoVeiculo?: string | null;
  fotoContainer?: string | null;
  fotoDocumento?: string | null;

  fotoMaterial?: string | null;
  fotoNotaFiscal?: string | null;
  fotoVisitante?: string | null;

  entrada: string;
  saida?: string | null;

  status: StatusMovimentacao;
  tipoSaida?: TipoSaidaVeiculo;

  criadoPor?: string | null;
  finalizadoPor?: string | null;
};

export type ContainerTerminal = {
  id: string;

  numeroContainer: string;
  unidade: Unidade;

  cliente?: string;
  armador?: string;
  tipoContainer?: string;
  condicao: CondicaoContainer;

  status: StatusContainer;

  patio?: string;
  quadraId?: string | null;
  quadra?: string;
  pilha?: string;
  fila?: string;
  altura?: number;
  posicao?: string;

  quadraReservadaId?: string;
  patioReservado?: string;
  quadraReservada?: string;
  pilhaReservada?: string;
  filaReservada?: string;
  alturaReservada?: number;
  posicaoReservada?: string;
  reservadoEm?: string;
  reservadoPor?: string;
  observacaoReserva?: string;

  movimentoEntradaId?: string | null;
  movimentoAtualId?: string | null;
  movimentoSaidaId?: string | null;

  placaEntrada?: string | null;
  placaAtual?: string | null;
  placaSaida?: string | null;

  entradaEm: string;
  desmontadoEm?: string | null;
  montadoEm?: string | null;
  saidaEm?: string | null;

  observacoes?: string;

  criadoPor?: string | null;
  atualizadoPor?: string | null;

  criadoEm?: string;
  atualizadoEm?: string;
};

export type EventoContainer = {
  id: string;

  containerId: string;
  movimentoId?: string | null;

  tipoEvento: TipoEventoContainer;

  statusAnterior?: StatusContainer | null;
  statusNovo: StatusContainer;

  unidade: Unidade;

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

  motivo?: MotivoMovimentacaoContainer | string;
  observacao?: string;

  usuarioId?: string | null;
  usuarioNome?: string | null;

  criadoEm: string;
};

export type MovimentarContainerInput = {
  containerId: string;

  unidade: Unidade;
  patio?: string;
  pilha: string;
  fila: string;
  altura: number;

  motivo: MotivoMovimentacaoContainer | string;
  observacao?: string;

  movimentoId?: string | null;
};

export type MontarContainerInput = {
  containerId: string;
  movimentoId: string;

  placaCavalo: string;
  placaCarreta?: string;

  condicaoSaida: CondicaoContainer;
  observacao?: string;
};

export type FinalizarAcessoInput = {
  movimentoId: string;
  tipoSaida: TipoSaidaVeiculo;

  containerSaidaId?: string | null;

  portariaSaida?: Portaria;
  observacoes?: string;

  materialRecebido?: boolean;
  responsavelRecebimento?: string;
};

export const STORAGE_KEY = "costa_gate_movements_v1";

export type ModuleItem = {
  title: string;
  description: string;
  href: string;
};