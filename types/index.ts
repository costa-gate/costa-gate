export type Unidade = 'JAV 1' | 'JAV 2' | string;

export type Portaria =
  | 'Portaria JAV 1'
  | 'Portaria JAV 2'
  | string;

export type TipoAcesso =
  | 'Caminhão Operacional'
  | 'Entrega de Material'
  | 'Veículo Leve'
  | 'Visitante'
  | 'Prestador de Serviço'
  | 'Outro';

export type StatusMovimentacao =
  | 'Na Portaria'
  | 'Em Operação'
  | 'Aguardando Saída'
  | 'Finalizado'
  | string;

export type TipoSaidaVeiculo =
  | 'Sem Contêiner'
  | 'Com o Mesmo Contêiner'
  | 'Com Outro Contêiner'
  | 'Entrega Concluída'
  | 'Visita Finalizada'
  | 'Serviço Concluído'
  | 'Outro';

export type CondicaoContainer =
  | 'Cheio'
  | 'Vazio'
  | 'Não Informado';

export type StatusContainer =
  | 'Recebido'
  | 'Aguardando Desmontagem'
  | 'Desmontado'
  | 'Na Pilha'
  | 'Em Movimentação'
  | 'Aguardando Programação'
  | 'Programado para Saída'
  | 'Montado'
  | 'Saiu';

export type TipoEventoContainer =
  | 'Recebimento'
  | 'Desmontagem'
  | 'Armazenamento'
  | 'Movimentação'
  | 'Programação de Saída'
  | 'Montagem'
  | 'Saída'
  | 'Cancelamento'
  | 'Correção';

export type MotivoMovimentacaoContainer =
  | 'Armazenamento inicial'
  | 'Organização de pátio'
  | 'Separação para entrega'
  | 'Separação para coleta'
  | 'Reposicionamento'
  | 'Carregamento'
  | 'Descarregamento'
  | 'Inspeção'
  | 'Outro';

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
  pilha?: string;
  fila?: string;
  altura?: number;
  posicao?: string;

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

export const STORAGE_KEY = 'costa_gate_movements_v1';

export type ModuleItem = {
  title: string;
  description: string;
  href: string;
};