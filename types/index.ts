export type Unidade = 'JAV 1' | 'JAV 2' | string;

export type StatusMovimentacao = 'Na Portaria' | 'Em Operação' | 'Aguardando Saída' | 'Finalizado' | string;

export type VehicleMovement = {
  id: string;
  unidade: Unidade;
  placaCavalo: string;
  placaCarreta: string;
  motorista: string;
  telefone?: string;
  transportadora?: string;
  cliente: string;
  numeroContainer: string;
  lacre: string;
  armador?: string;
  tipoContainer?: string;
  condicao?: string;
  operacao: string;
  observacoes?: string;
  fotoVeiculo?: string | null;
  fotoContainer?: string | null;
  fotoDocumento?: string | null;
  entrada: string; // ISO datetime
  saida?: string | null; // ISO datetime
  status: StatusMovimentacao;
};

export const STORAGE_KEY = 'costa_gate_movements_v1';
export type ModuleItem = {
  title: string;
  description: string;
  href: string;
};
