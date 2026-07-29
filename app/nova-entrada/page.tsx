"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { createMovement } from '@/lib/movements';
import { useRouter } from 'next/navigation';

const unidadeOptions = ['JAV 1', 'JAV 2'];
const tipoContainerOptions = ['20DC', '40DC', '40HC', 'Outro'];
const condicaoOptions = ['Cheio', 'Vazio'];

type FormValues = {
  unidade: string;
  placaCavalo: string;
  placaCarreta: string;
  motorista: string;
  telefone: string;
  transportadora: string;
  cliente: string;
  numeroContainer: string;
  lacre: string;
  armador: string;
  tipoContainer: string;
  condicao: string;
  operacao: string;
  observacoes: string;
  fotoVeiculo: File | null;
  fotoContainer: File | null;
  fotoDocumento: File | null;
};

const initialValues: FormValues = {
  unidade: '',
  placaCavalo: '',
  placaCarreta: '',
  motorista: '',
  telefone: '',
  transportadora: '',
  cliente: '',
  numeroContainer: '',
  lacre: '',
  armador: '',
  tipoContainer: '',
  condicao: '',
  operacao: '',
  observacoes: '',
  fotoVeiculo: null,
  fotoContainer: null,
  fotoDocumento: null,
};

export default function NovaEntradaPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  const handleChange = (field: keyof FormValues, value: string | File | null) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSuccessMessage('');
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.unidade) nextErrors.unidade = 'Unidade é obrigatória.';
    if (!values.placaCavalo.trim()) nextErrors.placaCavalo = 'Placa do cavalo é obrigatória.';
    if (!values.placaCarreta.trim()) nextErrors.placaCarreta = 'Placa da carreta é obrigatória.';
    if (!values.motorista.trim()) nextErrors.motorista = 'Motorista é obrigatório.';
    if (!values.telefone.trim()) nextErrors.telefone = 'Telefone é obrigatório.';
    if (!values.transportadora.trim()) nextErrors.transportadora = 'Transportadora é obrigatória.';
    if (!values.cliente.trim()) nextErrors.cliente = 'Cliente é obrigatório.';
    if (!values.numeroContainer.trim()) nextErrors.numeroContainer = 'Número do contêiner é obrigatório.';
    if (!values.lacre.trim()) nextErrors.lacre = 'Lacre é obrigatório.';
    if (!values.armador.trim()) nextErrors.armador = 'Armador é obrigatório.';
    if (!values.tipoContainer) nextErrors.tipoContainer = 'Tipo de contêiner é obrigatório.';
    if (!values.condicao) nextErrors.condicao = 'Condição é obrigatória.';
    if (!values.operacao.trim()) nextErrors.operacao = 'Operação é obrigatória.';

    return nextErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage('');
      return;
    }

    setErrors({});
    // persist in localStorage
    const fotos = {
      fotoVeiculo: values.fotoVeiculo ? values.fotoVeiculo.name : null,
      fotoContainer: values.fotoContainer ? values.fotoContainer.name : null,
      fotoDocumento: values.fotoDocumento ? values.fotoDocumento.name : null,
    };

    createMovement({
      unidade: values.unidade,
      placaCavalo: values.placaCavalo,
      placaCarreta: values.placaCarreta,
      motorista: values.motorista,
      telefone: values.telefone,
      transportadora: values.transportadora,
      cliente: values.cliente,
      numeroContainer: values.numeroContainer,
      lacre: values.lacre,
      armador: values.armador,
      tipoContainer: values.tipoContainer,
      condicao: values.condicao,
      operacao: values.operacao,
      observacoes: values.observacoes,
      fotos,
    });

    setSuccessMessage('Entrada registrada com sucesso');
    setValues(initialValues);
    // redirect to vehicles list after small delay to show success
    setTimeout(() => {
      router.push('/veiculos-na-unidade');
    }, 600);
  };

  const handleFileChange = (field: 'fotoVeiculo' | 'fotoContainer' | 'fotoDocumento', file: File | null) => {
    handleChange(field, file);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />
      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Nova Entrada</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-50">Registrar movimentação</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                  Preencha os dados da entrada e confirme a movimentação. Os campos obrigatórios devem estar completos para registrar a entrada.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900"
              >
                Voltar ao dashboard
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/10 bg-slate-900/50 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Unidade</label>
                <select
                  value={values.unidade}
                  onChange={(event) => handleChange('unidade', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option value="">Selecione</option>
                  {unidadeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.unidade && <p className="text-xs text-rose-400">{errors.unidade}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Placa do cavalo</label>
                <input
                  value={values.placaCavalo}
                  onChange={(event) => handleChange('placaCavalo', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="ABC1D23"
                />
                {errors.placaCavalo && <p className="text-xs text-rose-400">{errors.placaCavalo}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Placa da carreta</label>
                <input
                  value={values.placaCarreta}
                  onChange={(event) => handleChange('placaCarreta', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="XYZ9E87"
                />
                {errors.placaCarreta && <p className="text-xs text-rose-400">{errors.placaCarreta}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Motorista</label>
                <input
                  value={values.motorista}
                  onChange={(event) => handleChange('motorista', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Nome do motorista"
                />
                {errors.motorista && <p className="text-xs text-rose-400">{errors.motorista}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Telefone</label>
                <input
                  value={values.telefone}
                  onChange={(event) => handleChange('telefone', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="(00) 0 0000-0000"
                />
                {errors.telefone && <p className="text-xs text-rose-400">{errors.telefone}</p>}
              </div>

              <div className="space-y-3 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-200">Transportadora</label>
                <input
                  value={values.transportadora}
                  onChange={(event) => handleChange('transportadora', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Nome da transportadora"
                />
                {errors.transportadora && <p className="text-xs text-rose-400">{errors.transportadora}</p>}
              </div>

              <div className="space-y-3 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-200">Cliente</label>
                <input
                  value={values.cliente}
                  onChange={(event) => handleChange('cliente', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Nome do cliente"
                />
                {errors.cliente && <p className="text-xs text-rose-400">{errors.cliente}</p>}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Número do contêiner</label>
                <input
                  value={values.numeroContainer}
                  onChange={(event) => handleChange('numeroContainer', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="CONT1234567"
                />
                {errors.numeroContainer && <p className="text-xs text-rose-400">{errors.numeroContainer}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Lacre</label>
                <input
                  value={values.lacre}
                  onChange={(event) => handleChange('lacre', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Lacre"
                />
                {errors.lacre && <p className="text-xs text-rose-400">{errors.lacre}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Armador</label>
                <input
                  value={values.armador}
                  onChange={(event) => handleChange('armador', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Armador"
                />
                {errors.armador && <p className="text-xs text-rose-400">{errors.armador}</p>}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Tipo de contêiner</label>
                <select
                  value={values.tipoContainer}
                  onChange={(event) => handleChange('tipoContainer', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option value="">Selecione</option>
                  {tipoContainerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.tipoContainer && <p className="text-xs text-rose-400">{errors.tipoContainer}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Condição</label>
                <select
                  value={values.condicao}
                  onChange={(event) => handleChange('condicao', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option value="">Selecione</option>
                  {condicaoOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.condicao && <p className="text-xs text-rose-400">{errors.condicao}</p>}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Operação</label>
                <textarea
                  value={values.operacao}
                  onChange={(event) => handleChange('operacao', event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Descreva a operação"
                />
                {errors.operacao && <p className="text-xs text-rose-400">{errors.operacao}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-200">Observações</label>
                <textarea
                  value={values.observacoes}
                  onChange={(event) => handleChange('observacoes', event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="Detalhes adicionais"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-medium text-slate-200">Foto do veículo</p>
                <label className="flex min-h-[140px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/70 px-4 text-center text-sm text-slate-400 transition hover:border-emerald-400/50 hover:text-slate-100">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange('fotoVeiculo', event.target.files?.[0] ?? null)}
                  />
                  {values.fotoVeiculo ? values.fotoVeiculo.name : 'Clique para adicionar foto do veículo'}
                </label>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-medium text-slate-200">Foto do contêiner</p>
                <label className="flex min-h-[140px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/70 px-4 text-center text-sm text-slate-400 transition hover:border-emerald-400/50 hover:text-slate-100">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange('fotoContainer', event.target.files?.[0] ?? null)}
                  />
                  {values.fotoContainer ? values.fotoContainer.name : 'Clique para adicionar foto do contêiner'}
                </label>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-medium text-slate-200">Foto do documento</p>
                <label className="flex min-h-[140px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/70 px-4 text-center text-sm text-slate-400 transition hover:border-emerald-400/50 hover:text-slate-100">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange('fotoDocumento', event.target.files?.[0] ?? null)}
                  />
                  {values.fotoDocumento ? values.fotoDocumento.name : 'Clique para adicionar foto do documento'}
                </label>
              </div>
            </div>

            {successMessage ? (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Registrar Entrada
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
