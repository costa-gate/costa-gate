"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createContainerFromMovement } from "@/lib/containers";
import { createMovement } from "@/lib/movements";
import type { CondicaoContainer, TipoAcesso } from "@/types";

const accessTypes: Array<{
  value: TipoAcesso;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    value: "Caminhão Operacional",
    title: "Caminhão operacional",
    description: "Com ou sem contêiner",
    icon: "🚛",
  },
  {
    value: "Entrega de Material",
    title: "Entrega de material",
    description: "NF, material e recebimento",
    icon: "📦",
  },
  {
    value: "Visitante",
    title: "Visitante",
    description: "Acesso rápido de pessoa",
    icon: "👤",
  },
  {
    value: "Veículo Leve",
    title: "Veículo leve",
    description: "Carro, utilitário ou moto",
    icon: "🚗",
  },
  {
    value: "Prestador de Serviço",
    title: "Prestador",
    description: "Serviço, manutenção ou apoio",
    icon: "🛠️",
  },
  {
    value: "Outro",
    title: "Outro acesso",
    description: "Equipamento ou situação especial",
    icon: "🔎",
  },
];

type FormValues = {
  tipoAcesso: TipoAcesso;
  unidade: string;
  portariaEntrada: string;

  placaCavalo: string;
  placaCarreta: string;
  motorista: string;
  telefone: string;
  transportadora: string;
  cliente: string;
  operacao: string;
  observacoes: string;

  possuiContainer: boolean;
  motivoSemContainer: "" | "Montagem de Contêiner" | "Outros";
  justificativaSemContainer: string;
  numeroContainer: string;
  lacre: string;
  armador: string;
  tipoContainer: string;
  condicao: CondicaoContainer;

  nomeVisitante: string;
  documentoVisitante: string;
  empresaVisitante: string;
  pessoaVisitada: string;
  motivoVisita: string;

  tipoMaterial: string;
  descricaoMaterial: string;
  numeroNotaFiscal: string;
  setorDestino: string;
  responsavelRecebimento: string;

  fotoVeiculo: File | null;
  fotoContainer: File | null;
  fotoDocumento: File | null;
  fotoMaterial: File | null;
  fotoNotaFiscal: File | null;
  fotoVisitante: File | null;
};

const initialValues: FormValues = {
  tipoAcesso: "Caminhão Operacional",
  unidade: "",
  portariaEntrada: "",

  placaCavalo: "",
  placaCarreta: "",
  motorista: "",
  telefone: "",
  transportadora: "",
  cliente: "",
  operacao: "",
  observacoes: "",

  possuiContainer: true,
  motivoSemContainer: "",
  justificativaSemContainer: "",
  numeroContainer: "",
  lacre: "",
  armador: "",
  tipoContainer: "",
  condicao: "Não Informado",

  nomeVisitante: "",
  documentoVisitante: "",
  empresaVisitante: "",
  pessoaVisitada: "",
  motivoVisita: "",

  tipoMaterial: "",
  descricaoMaterial: "",
  numeroNotaFiscal: "",
  setorDestino: "",
  responsavelRecebimento: "",

  fotoVeiculo: null,
  fotoContainer: null,
  fotoDocumento: null,
  fotoMaterial: null,
  fotoNotaFiscal: null,
  fotoVisitante: null,
};

type ErrorMap = Partial<Record<keyof FormValues, string>>;

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      {children}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </label>
  );
}

function FileCard({
  title,
  value,
  onChange,
  required = false,
}: {
  title: string;
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-sm font-semibold text-slate-200">
        {title} {required ? <span className="text-rose-400">*</span> : null}
      </p>
      <label className="mt-3 flex min-h-[120px] cursor-pointer items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/70 px-4 text-center text-sm text-slate-400 transition hover:border-emerald-400/50 hover:text-slate-100">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        {value ? value.name : "Clique para anexar"}
      </label>
    </div>
  );
}

export default function NovaEntradaPage() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTruck = values.tipoAcesso === "Caminhão Operacional";
  const isDelivery = values.tipoAcesso === "Entrega de Material";
  const isVisitor = values.tipoAcesso === "Visitante";
  const isLightVehicle = values.tipoAcesso === "Veículo Leve";
  const isProvider = values.tipoAcesso === "Prestador de Serviço";
  const hasVehicle =
    isTruck || isDelivery || isLightVehicle || isProvider || values.tipoAcesso === "Outro";

  const title = useMemo(() => {
    return accessTypes.find((item) => item.value === values.tipoAcesso)?.title;
  }, [values.tipoAcesso]);

  const handleChange = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  };

  const selectAccessType = (type: TipoAcesso) => {
    setValues((current) => ({
      ...initialValues,
      unidade: current.unidade,
      portariaEntrada: current.portariaEntrada,
      tipoAcesso: type,
      possuiContainer: type === "Caminhão Operacional",
    }));
    setErrors({});
    setSubmitError("");
    setSuccessMessage("");
  };

  const validate = () => {
    const nextErrors: ErrorMap = {};

    if (!values.unidade) nextErrors.unidade = "Selecione a unidade.";
    if (!values.portariaEntrada) {
      nextErrors.portariaEntrada = "Selecione a portaria.";
    }

    if (isVisitor) {
      if (!values.nomeVisitante.trim()) {
        nextErrors.nomeVisitante = "Informe o nome.";
      }
      if (!values.documentoVisitante.trim()) {
        nextErrors.documentoVisitante = "Informe o documento.";
      }
      if (!values.pessoaVisitada.trim()) {
        nextErrors.pessoaVisitada = "Informe quem será visitado.";
      }
      if (!values.motivoVisita.trim()) {
        nextErrors.motivoVisita = "Informe o motivo.";
      }
      if (!values.fotoDocumento) {
        nextErrors.fotoDocumento = "Anexe o documento.";
      }
    }

    if (hasVehicle && !isVisitor) {
      if (!values.placaCavalo.trim()) {
        nextErrors.placaCavalo = "Informe a placa.";
      }
      if (!values.motorista.trim()) {
        nextErrors.motorista = "Informe o condutor.";
      }
    }

    if (isTruck) {
      if (!values.transportadora.trim()) {
        nextErrors.transportadora = "Informe a transportadora.";
      }
      if (
        values.possuiContainer &&
        !values.cliente.trim()
      ) {
        nextErrors.cliente = "Informe o cliente.";
      }
      if (values.possuiContainer && !values.operacao.trim()) {
        nextErrors.operacao = "Informe a operação.";
      }

      if (!values.possuiContainer) {
        if (!values.motivoSemContainer) {
          nextErrors.motivoSemContainer =
            "Informe o motivo da entrada sem contêiner.";
        }

        if (
          values.motivoSemContainer === "Outros" &&
          !values.justificativaSemContainer.trim()
        ) {
          nextErrors.justificativaSemContainer =
            "Justifique o motivo da entrada.";
        }
      }

      if (values.possuiContainer) {
        if (!values.numeroContainer.trim()) {
          nextErrors.numeroContainer = "Informe o contêiner.";
        }
        if (!values.tipoContainer) {
          nextErrors.tipoContainer = "Selecione o tipo.";
        }
        if (!values.condicao || values.condicao === "Não Informado") {
          nextErrors.condicao = "Selecione a condição.";
        }
        if (!values.fotoContainer) {
          nextErrors.fotoContainer = "Anexe a foto do contêiner.";
        }
      }

      if (!values.fotoVeiculo) {
        nextErrors.fotoVeiculo = "Anexe a foto do veículo.";
      }
      if (!values.fotoDocumento) {
        nextErrors.fotoDocumento = "Anexe o documento.";
      }
    }

    if (isDelivery) {
      if (!values.transportadora.trim()) {
        nextErrors.transportadora = "Informe a empresa.";
      }
      if (!values.descricaoMaterial.trim()) {
        nextErrors.descricaoMaterial = "Descreva o material.";
      }
      if (!values.numeroNotaFiscal.trim()) {
        nextErrors.numeroNotaFiscal = "Informe a NF.";
      }
      if (!values.setorDestino.trim()) {
        nextErrors.setorDestino = "Informe o destino.";
      }
      if (!values.fotoMaterial) {
        nextErrors.fotoMaterial = "Anexe a foto do material.";
      }
      if (!values.fotoNotaFiscal) {
        nextErrors.fotoNotaFiscal = "Anexe a nota fiscal.";
      }
    }

    if (isLightVehicle && !values.operacao.trim()) {
      nextErrors.operacao = "Informe o motivo do acesso.";
    }

    if (isProvider) {
      if (!values.transportadora.trim()) {
        nextErrors.transportadora = "Informe a empresa.";
      }
      if (!values.operacao.trim()) {
        nextErrors.operacao = "Informe o serviço.";
      }
      if (!values.fotoDocumento) {
        nextErrors.fotoDocumento = "Anexe o documento.";
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("Revise os campos destacados.");
      return;
    }

    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const movement = await createMovement({
        tipoAcesso: values.tipoAcesso,
        unidade: values.unidade,
        portariaEntrada: values.portariaEntrada,

        placaCavalo: values.placaCavalo.trim().toUpperCase(),
        placaCarreta: values.placaCarreta.trim().toUpperCase(),
        motorista: isVisitor
          ? values.nomeVisitante.trim()
          : values.motorista.trim(),
        telefone: values.telefone.trim(),
        transportadora: isVisitor
          ? values.empresaVisitante.trim()
          : values.transportadora.trim(),
        cliente:
          values.cliente.trim() ||
          values.setorDestino.trim() ||
          values.pessoaVisitada.trim() ||
          values.empresaVisitante.trim() ||
          "Acesso geral",

        numeroContainer:
          isTruck && values.possuiContainer
            ? values.numeroContainer.trim().toUpperCase()
            : "",
        lacre:
          isTruck && values.possuiContainer
            ? values.lacre.trim().toUpperCase()
            : "",
        armador:
          isTruck && values.possuiContainer ? values.armador.trim() : "",
        tipoContainer:
          isTruck && values.possuiContainer ? values.tipoContainer : "",
        // Condição física só existe para entrada com contêiner.
        // Para visitante, material, veículo leve, prestador e outros,
        // a propriedade é omitida e o banco grava NULL.
        condicao:
          isTruck && values.possuiContainer ? values.condicao : undefined,

        operacao:
          isTruck && !values.possuiContainer
            ? values.motivoSemContainer === "Montagem de Contêiner"
              ? "Montagem de Contêiner"
              : `Outros — ${values.justificativaSemContainer.trim()}`
            : values.operacao.trim() ||
              values.motivoVisita.trim() ||
              values.descricaoMaterial.trim() ||
              title ||
              "Acesso",
        observacoes: values.observacoes.trim(),

        motivoEntradaSemContainer:
          isTruck && !values.possuiContainer
            ? values.motivoSemContainer
            : null,
        justificativaEntrada:
          isTruck &&
          !values.possuiContainer &&
          values.motivoSemContainer === "Outros"
            ? values.justificativaSemContainer.trim()
            : null,
        exigeFilaOperacional:
          isTruck &&
          !values.possuiContainer &&
          values.motivoSemContainer === "Montagem de Contêiner",
        etapaOperacional:
          isTruck &&
          !values.possuiContainer &&
          values.motivoSemContainer === "Montagem de Contêiner"
            ? "AGUARDANDO_CONFERENTE"
            : null,

        nomeVisitante: values.nomeVisitante.trim(),
        documentoVisitante: values.documentoVisitante.trim(),
        empresaVisitante: values.empresaVisitante.trim(),
        pessoaVisitada: values.pessoaVisitada.trim(),
        motivoVisita: values.motivoVisita.trim(),

        tipoMaterial: values.tipoMaterial.trim(),
        descricaoMaterial: values.descricaoMaterial.trim(),
        numeroNotaFiscal: values.numeroNotaFiscal.trim(),
        setorDestino: values.setorDestino.trim(),
        responsavelRecebimento: values.responsavelRecebimento.trim(),

        files: {
          fotoVeiculo: values.fotoVeiculo,
          fotoContainer: values.fotoContainer,
          fotoDocumento: values.fotoDocumento,
          fotoMaterial: values.fotoMaterial,
          fotoNotaFiscal: values.fotoNotaFiscal,
          fotoVisitante: values.fotoVisitante,
        },
      });

      if (isTruck && values.possuiContainer) {
        await createContainerFromMovement({
          numeroContainer: values.numeroContainer,
          unidade: values.unidade,
          cliente: values.cliente,
          armador: values.armador,
          tipoContainer: values.tipoContainer,
          condicao: values.condicao,
          movimentoEntradaId: movement.id,
          placaEntrada: values.placaCavalo,
          observacoes: values.observacoes,
        });
      }

      setSuccessMessage("Entrada registrada com sucesso.");
      setValues(initialValues);

      window.setTimeout(() => {
        router.push(
          isTruck && values.possuiContainer
            ? "/controle-containers"
            : "/veiculos-na-unidade",
        );
      }, 700);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Falha ao registrar a entrada.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617] text-slate-100">
      <Sidebar />

      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-[30px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-400">
              Controle de acesso
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              Nova entrada
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Selecione o tipo de acesso. A tela mostrará somente os campos e
              evidências necessários para concluir o registro rapidamente.
            </p>
          </header>

          <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900/55 p-4 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              O que está entrando?
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {accessTypes.map((item) => {
                const active = values.tipoAcesso === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => selectAccessType(item.value)}
                    className={`rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-emerald-400/50 bg-emerald-500/15 shadow-lg shadow-emerald-950/30"
                        : "border-white/10 bg-slate-950/60 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-black text-slate-100">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-[30px] border border-white/10 bg-slate-900/55 p-5 shadow-2xl sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Unidade" error={errors.unidade}>
                <select
                  value={values.unidade}
                  onChange={(event) =>
                    handleChange("unidade", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>
                  <option>JAV 1</option>
                  <option>JAV 2</option>
                </select>
              </Field>

              <Field
                label="Portaria de entrada"
                error={errors.portariaEntrada}
              >
                <select
                  value={values.portariaEntrada}
                  onChange={(event) =>
                    handleChange("portariaEntrada", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>
                  <option>Portaria JAV 1</option>
                  <option>Portaria JAV 2</option>
                </select>
              </Field>
            </div>

            {isVisitor ? (
              <section className="mt-6">
                <h2 className="text-xl font-black">Dados do visitante</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Nome" error={errors.nomeVisitante}>
                    <input
                      value={values.nomeVisitante}
                      onChange={(event) =>
                        handleChange("nomeVisitante", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Nome completo"
                    />
                  </Field>

                  <Field
                    label="Documento"
                    error={errors.documentoVisitante}
                  >
                    <input
                      value={values.documentoVisitante}
                      onChange={(event) =>
                        handleChange("documentoVisitante", event.target.value)
                      }
                      className={inputClass}
                      placeholder="CPF, RG ou CNH"
                    />
                  </Field>

                  <Field label="Empresa">
                    <input
                      value={values.empresaVisitante}
                      onChange={(event) =>
                        handleChange("empresaVisitante", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Opcional"
                    />
                  </Field>

                  <Field label="Telefone">
                    <input
                      value={values.telefone}
                      onChange={(event) =>
                        handleChange("telefone", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Opcional"
                    />
                  </Field>

                  <Field
                    label="Pessoa visitada"
                    error={errors.pessoaVisitada}
                  >
                    <input
                      value={values.pessoaVisitada}
                      onChange={(event) =>
                        handleChange("pessoaVisitada", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Nome ou setor"
                    />
                  </Field>

                  <Field label="Motivo da visita" error={errors.motivoVisita}>
                    <input
                      value={values.motivoVisita}
                      onChange={(event) =>
                        handleChange("motivoVisita", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Reunião, visita técnica..."
                    />
                  </Field>

                  <Field label="Placa do veículo, se houver">
                    <input
                      value={values.placaCavalo}
                      onChange={(event) =>
                        handleChange(
                          "placaCavalo",
                          event.target.value.toUpperCase(),
                        )
                      }
                      className={inputClass}
                      placeholder="Opcional"
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {hasVehicle && !isVisitor ? (
              <section className="mt-6">
                <h2 className="text-xl font-black">Veículo e condutor</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Placa" error={errors.placaCavalo}>
                    <input
                      value={values.placaCavalo}
                      onChange={(event) =>
                        handleChange(
                          "placaCavalo",
                          event.target.value.toUpperCase(),
                        )
                      }
                      className={inputClass}
                      placeholder="ABC1D23"
                    />
                  </Field>

                  {isTruck ? (
                    <Field label="Placa da carreta">
                      <input
                        value={values.placaCarreta}
                        onChange={(event) =>
                          handleChange(
                            "placaCarreta",
                            event.target.value.toUpperCase(),
                          )
                        }
                        className={inputClass}
                        placeholder="Opcional"
                      />
                    </Field>
                  ) : null}

                  <Field label="Condutor" error={errors.motorista}>
                    <input
                      value={values.motorista}
                      onChange={(event) =>
                        handleChange("motorista", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Nome"
                    />
                  </Field>

                  <Field label="Telefone">
                    <input
                      value={values.telefone}
                      onChange={(event) =>
                        handleChange("telefone", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Opcional"
                    />
                  </Field>

                  <Field
                    label={isDelivery ? "Empresa fornecedora" : "Empresa"}
                    error={errors.transportadora}
                    className="sm:col-span-2"
                  >
                    <input
                      value={values.transportadora}
                      onChange={(event) =>
                        handleChange("transportadora", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Transportadora, prestador ou fornecedor"
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {isTruck ? (
              <>
                <section className="mt-6">
                  <div className="flex flex-col gap-3 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-cyan-100">
                        O caminhão está entrando com contêiner?
                      </p>
                      <p className="mt-1 text-xs text-cyan-200/70">
                        Ao marcar “sim”, o estoque será criado automaticamente.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {[true, false].map((option) => (
                        <button
                          key={String(option)}
                          type="button"
                          onClick={() => {
                            handleChange("possuiContainer", option);

                            if (option) {
                              handleChange("motivoSemContainer", "");
                              handleChange(
                                "justificativaSemContainer",
                                "",
                              );
                            }
                          }}
                          className={`rounded-2xl px-5 py-2 text-sm font-black ${
                            values.possuiContainer === option
                              ? "bg-cyan-300 text-slate-950"
                              : "border border-white/10 bg-slate-950 text-slate-300"
                          }`}
                        >
                          {option ? "Sim" : "Não"}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {!values.possuiContainer ? (
                  <section className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5">
                    <h2 className="text-xl font-black text-amber-100">
                      Motivo da entrada sem contêiner
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Montagem entra na Fila Operacional. Outros fica
                      somente em Veículos na Unidade.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          value: "Montagem de Contêiner" as const,
                          title: "Montagem de contêiner",
                          description:
                            "Conferente orienta e operador executa.",
                        },
                        {
                          value: "Outros" as const,
                          title: "Outros",
                          description:
                            "Estacionamento, espera, apoio ou outra situação.",
                        },
                      ].map((option) => {
                        const active =
                          values.motivoSemContainer === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              handleChange(
                                "motivoSemContainer",
                                option.value,
                              );

                              if (option.value !== "Outros") {
                                handleChange(
                                  "justificativaSemContainer",
                                  "",
                                );
                              }
                            }}
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-amber-300/50 bg-amber-500/15"
                                : "border-white/10 bg-slate-950/60 hover:border-white/20"
                            }`}
                          >
                            <p className="font-black text-slate-100">
                              {option.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {option.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {errors.motivoSemContainer ? (
                      <p className="mt-3 text-xs text-rose-400">
                        {errors.motivoSemContainer}
                      </p>
                    ) : null}

                    {values.motivoSemContainer === "Outros" ? (
                      <Field
                        label="Justificativa da entrada"
                        error={errors.justificativaSemContainer}
                        className="mt-4"
                      >
                        <textarea
                          value={values.justificativaSemContainer}
                          onChange={(event) =>
                            handleChange(
                              "justificativaSemContainer",
                              event.target.value,
                            )
                          }
                          rows={3}
                          className={inputClass}
                          placeholder="Ex.: estacionamento, aguardando programação, veículo reserva..."
                        />
                      </Field>
                    ) : null}
                  </section>
                ) : null}

                {values.possuiContainer ? (
                <section className="mt-6">
                  <h2 className="text-xl font-black">Operação</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Cliente" error={errors.cliente}>
                      <input
                        value={values.cliente}
                        onChange={(event) =>
                          handleChange("cliente", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Operação" error={errors.operacao}>
                      <input
                        value={values.operacao}
                        onChange={(event) =>
                          handleChange("operacao", event.target.value)
                        }
                        className={inputClass}
                        placeholder="Desova, transbordo, entrega..."
                      />
                    </Field>
                  </div>
                </section>
                ) : null}

                {values.possuiContainer ? (
                  <section className="mt-6">
                    <h2 className="text-xl font-black">Contêiner</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field
                        label="Número"
                        error={errors.numeroContainer}
                      >
                        <input
                          value={values.numeroContainer}
                          onChange={(event) =>
                            handleChange(
                              "numeroContainer",
                              event.target.value.toUpperCase(),
                            )
                          }
                          className={inputClass}
                          placeholder="ABCD1234567"
                        />
                      </Field>

                      <Field label="Lacre">
                        <input
                          value={values.lacre}
                          onChange={(event) =>
                            handleChange("lacre", event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Armador">
                        <input
                          value={values.armador}
                          onChange={(event) =>
                            handleChange("armador", event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field
                        label="Tipo"
                        error={errors.tipoContainer}
                      >
                        <select
                          value={values.tipoContainer}
                          onChange={(event) =>
                            handleChange("tipoContainer", event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Selecione</option>
                          <option>20DC</option>
                          <option>40DC</option>
                          <option>40HC</option>
                          <option>Outro</option>
                        </select>
                      </Field>

                      <Field label="Condição" error={errors.condicao}>
                        <select
                          value={values.condicao}
                          onChange={(event) =>
                            handleChange(
                              "condicao",
                              event.target.value as CondicaoContainer,
                            )
                          }
                          className={inputClass}
                        >
                          <option>Não Informado</option>
                          <option>Cheio</option>
                          <option>Vazio</option>
                        </select>
                      </Field>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}

            {isDelivery ? (
              <section className="mt-6">
                <h2 className="text-xl font-black">Recebimento de material</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Tipo de material">
                    <input
                      value={values.tipoMaterial}
                      onChange={(event) =>
                        handleChange("tipoMaterial", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Peças, expediente, manutenção..."
                    />
                  </Field>

                  <Field
                    label="Número da nota fiscal"
                    error={errors.numeroNotaFiscal}
                  >
                    <input
                      value={values.numeroNotaFiscal}
                      onChange={(event) =>
                        handleChange("numeroNotaFiscal", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Descrição do material"
                    error={errors.descricaoMaterial}
                    className="sm:col-span-2"
                  >
                    <textarea
                      value={values.descricaoMaterial}
                      onChange={(event) =>
                        handleChange("descricaoMaterial", event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Setor de destino" error={errors.setorDestino}>
                    <input
                      value={values.setorDestino}
                      onChange={(event) =>
                        handleChange("setorDestino", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Responsável pelo recebimento">
                    <input
                      value={values.responsavelRecebimento}
                      onChange={(event) =>
                        handleChange(
                          "responsavelRecebimento",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {(isLightVehicle || isProvider || values.tipoAcesso === "Outro") ? (
              <section className="mt-6">
                <h2 className="text-xl font-black">Finalidade do acesso</h2>
                <div className="mt-4">
                  <Field
                    label={isProvider ? "Serviço a executar" : "Motivo"}
                    error={errors.operacao}
                  >
                    <textarea
                      value={values.operacao}
                      onChange={(event) =>
                        handleChange("operacao", event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            <section className="mt-6">
              <h2 className="text-xl font-black">Evidências</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {hasVehicle || values.placaCavalo ? (
                  <FileCard
                    title="Foto do veículo"
                    value={values.fotoVeiculo}
                    onChange={(file) => handleChange("fotoVeiculo", file)}
                    required={isTruck}
                  />
                ) : null}

                {isTruck && values.possuiContainer ? (
                  <FileCard
                    title="Foto do contêiner"
                    value={values.fotoContainer}
                    onChange={(file) => handleChange("fotoContainer", file)}
                    required
                  />
                ) : null}

                {(isTruck || isVisitor || isProvider) ? (
                  <FileCard
                    title={isVisitor ? "Documento do visitante" : "Documento"}
                    value={values.fotoDocumento}
                    onChange={(file) => handleChange("fotoDocumento", file)}
                    required
                  />
                ) : null}

                {isDelivery ? (
                  <>
                    <FileCard
                      title="Foto do material"
                      value={values.fotoMaterial}
                      onChange={(file) => handleChange("fotoMaterial", file)}
                      required
                    />
                    <FileCard
                      title="Nota fiscal"
                      value={values.fotoNotaFiscal}
                      onChange={(file) =>
                        handleChange("fotoNotaFiscal", file)
                      }
                      required
                    />
                  </>
                ) : null}
              </div>

              {[
                errors.fotoVeiculo,
                errors.fotoContainer,
                errors.fotoDocumento,
                errors.fotoMaterial,
                errors.fotoNotaFiscal,
              ].some(Boolean) ? (
                <p className="mt-3 text-xs text-rose-400">
                  Anexe as evidências obrigatórias indicadas acima.
                </p>
              ) : null}
            </section>

            <section className="mt-6">
              <Field label="Observações">
                <textarea
                  value={values.observacoes}
                  onChange={(event) =>
                    handleChange("observacoes", event.target.value)
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="Opcional"
                />
              </Field>
            </section>

            {successMessage ? (
              <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            {submitError ? (
              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-200">
                {submitError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-slate-950 px-6 py-3 text-center text-sm font-bold text-slate-200"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Registrando..." : "Registrar entrada"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
