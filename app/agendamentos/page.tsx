"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  cancelarAgendamento,
  confirmarAgendamento,
  criarAgendamento,
  listarAgendamentos,
  subscribeToAgendamentos,
} from "@/lib/agendamentos";
import type {
  Agendamento,
  CriarAgendamentoInput,
  StatusAgendamento,
  TipoAgendamento,
} from "@/types";

const tipos: TipoAgendamento[] = [
  "Caminhão com Contêiner",
  "Caminhão sem Contêiner",
  "Visitante",
  "Prestador de Serviço",
  "Manutenção",
  "Pedestre",
  "Entrega de Material",
  "Veículo Leve",
  "Outro",
];

const statusList: Array<StatusAgendamento | "Todos"> = [
  "Todos",
  "Agendado",
  "Em Recepção",
  "Recebido",
  "Não Compareceu",
  "Cancelado",
];

const initialForm: CriarAgendamentoInput = {
  tipo: "Caminhão com Contêiner",
  origem: "Manual",
  unidade: "JAV 1",
  dataPrevista: new Date().toISOString().slice(0, 16),
  cliente: "",
  operacao: "",
  destino: "",
  placaCavalo: "",
  placaCarreta: "",
  motorista: "",
  transportadora: "",
  numeroContainer: "",
  armador: "",
  observacoes: "",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const statusClass = (status: StatusAgendamento) => {
  switch (status) {
    case "Recebido":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "Em Recepção":
      return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
    case "Cancelado":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "Não Compareceu":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-white/10 bg-slate-900 text-slate-200";
  }
};

export default function AgendamentosPage() {
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<
    StatusAgendamento | "Todos"
  >("Agendado");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] =
    useState<CriarAgendamentoInput>(initialForm);

  const [confirming, setConfirming] =
    useState<Agendamento | null>(null);

  const [confirmData, setConfirmData] = useState({
    portariaEntrada: "Portaria JAV 1",
    placaCavalo: "",
    placaCarreta: "",
    motorista: "",
    telefone: "",
    transportadora: "",
    observacoes: "",
  });

  const [files, setFiles] = useState<{
    fotoVeiculo: File | null;
    fotoContainer: File | null;
    fotoDocumento: File | null;
    fotoVisitante: File | null;
  }>({
    fotoVeiculo: null,
    fotoContainer: null,
    fotoDocumento: null,
    fotoVisitante: null,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setItems(await listarAgendamentos());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os agendamentos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return subscribeToAgendamentos(load);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter((item) => {
      if (status !== "Todos" && item.status !== status) {
        return false;
      }

      if (!term) return true;

      return [
        item.numeroContainer,
        item.placaCavalo,
        item.placaCarreta,
        item.motorista,
        item.cliente,
        item.nomeVisitante,
        item.nomePedestre,
        item.transportadora,
        item.tipo,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term),
        );
    });
  }, [items, query, status]);

  const counts = useMemo(
    () => ({
      agendados: items.filter(
        (item) => item.status === "Agendado",
      ).length,
      recepcao: items.filter(
        (item) => item.status === "Em Recepção",
      ).length,
      recebidos: items.filter(
        (item) => item.status === "Recebido",
      ).length,
      pendentes: items.filter((item) =>
        ["Agendado", "Em Recepção"].includes(item.status),
      ).length,
    }),
    [items],
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.dataPrevista || !form.unidade || !form.tipo) {
      setError(
        "Informe tipo, unidade e data prevista.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await criarAgendamento({
        ...form,
        dataPrevista: new Date(
          form.dataPrevista,
        ).toISOString(),
      });

      setForm({
        ...initialForm,
        dataPrevista: new Date()
          .toISOString()
          .slice(0, 16),
      });
      setShowCreate(false);
      setSuccess("Agendamento criado com sucesso.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o agendamento.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openConfirmation = (item: Agendamento) => {
    setConfirming(item);
    setConfirmData({
      portariaEntrada:
        item.portaria ??
        (item.unidade === "JAV 2"
          ? "Portaria JAV 2"
          : "Portaria JAV 1"),
      placaCavalo: item.placaCavalo ?? "",
      placaCarreta: item.placaCarreta ?? "",
      motorista: item.motorista ?? "",
      telefone: item.telefone ?? "",
      transportadora: item.transportadora ?? "",
      observacoes: "",
    });
    setFiles({
      fotoVeiculo: null,
      fotoContainer: null,
      fotoDocumento: null,
      fotoVisitante: null,
    });
    setError("");
    setSuccess("");
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();

    if (!confirming) return;

    const isCaminhao =
      confirming.tipo === "Caminhão com Contêiner" ||
      confirming.tipo === "Caminhão sem Contêiner";

    if (
      isCaminhao &&
      (!confirmData.placaCavalo ||
        !confirmData.motorista)
    ) {
      setError(
        "Confirme a placa do cavalo e o motorista.",
      );
      return;
    }

    if (
      isCaminhao &&
      (!files.fotoVeiculo ||
        !files.fotoDocumento)
    ) {
      setError(
        "Anexe a foto do veículo e do documento.",
      );
      return;
    }

    if (
      confirming.tipo === "Caminhão com Contêiner" &&
      !files.fotoContainer
    ) {
      setError(
        "Anexe também a foto do contêiner.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await confirmarAgendamento({
        agendamentoId: confirming.id,
        portariaEntrada:
          confirmData.portariaEntrada,
        placaCavalo: confirmData.placaCavalo,
        placaCarreta: confirmData.placaCarreta,
        motorista: confirmData.motorista,
        telefone: confirmData.telefone,
        transportadora:
          confirmData.transportadora,
        observacoes: confirmData.observacoes,
        fotoVeiculo: files.fotoVeiculo,
        fotoContainer: files.fotoContainer,
        fotoDocumento: files.fotoDocumento,
        fotoVisitante: files.fotoVisitante,
      });

      setConfirming(null);
      setSuccess(
        "Entrada confirmada e movimentação criada.",
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível confirmar a entrada.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (item: Agendamento) => {
    const motivo = window.prompt(
      "Informe o motivo do cancelamento:",
    );

    if (motivo === null) return;

    try {
      setSaving(true);
      setError("");
      await cancelarAgendamento(item.id, motivo);
      setSuccess("Agendamento cancelado.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível cancelar.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />

      <div className="mx-auto max-w-[1500px] px-5 py-8 lg:ml-[280px] lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Recepção planejada
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Agendamentos
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                O AGP confirma o que já foi planejado. O que
                não estiver na lista segue pela Nova Entrada.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
              >
                Novo agendamento
              </button>

              <button
                type="button"
                disabled
                title="Será habilitado na etapa de importação por Excel."
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-500"
              >
                Importar Excel
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            ["Agendados", counts.agendados],
            ["Em recepção", counts.recepcao],
            ["Recebidos", counts.recebidos],
            ["Pendentes", counts.pendentes],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Buscar contêiner, placa, motorista, visitante ou cliente"
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-emerald-400/40"
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | StatusAgendamento
                    | "Todos",
                )
              }
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
            >
              {statusList.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {success}
            </div>
          )}

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="py-10 text-center text-slate-400">
                Carregando agendamentos...
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-slate-400">
                Nenhum agendamento encontrado.
              </p>
            ) : (
              filtered.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-slate-950/80 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                          {item.tipo}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h2 className="mt-2 truncate text-xl font-black">
                        {item.numeroContainer ||
                          item.placaCavalo ||
                          item.nomeVisitante ||
                          item.nomePedestre ||
                          item.descricaoOutro ||
                          "Agendamento"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        {[
                          item.cliente,
                          item.motorista,
                          item.transportadora,
                          item.empresaVisitante,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "Dados complementares pendentes"}
                      </p>
                    </div>

                    <div className="grid min-w-[320px] grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/5 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          Previsto
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatDate(item.dataPrevista)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/5 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          Unidade
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {item.unidade}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {["Agendado", "Em Recepção", "Não Compareceu"].includes(
                      item.status,
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmation(item)
                        }
                        className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
                      >
                        Confirmar entrada
                      </button>
                    )}

                    {["Agendado", "Em Recepção", "Não Compareceu"].includes(
                      item.status,
                    ) && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleCancel(item)}
                        className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-sm font-black text-rose-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <form
            onSubmit={handleCreate}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Planejamento
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Novo agendamento
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold">Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tipo: event.target
                        .value as TipoAgendamento,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                >
                  {tipos.map((tipo) => (
                    <option key={tipo}>{tipo}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Data prevista
                </span>
                <input
                  type="datetime-local"
                  value={form.dataPrevista}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      dataPrevista: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Unidade</span>
                <select
                  value={form.unidade}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      unidade: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                >
                  <option>JAV 1</option>
                  <option>JAV 2</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Cliente</span>
                <input
                  value={form.cliente ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cliente: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Número do contêiner
                </span>
                <input
                  value={form.numeroContainer ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      numeroContainer:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 uppercase"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Placa do cavalo
                </span>
                <input
                  value={form.placaCavalo ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      placaCavalo:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 uppercase"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Placa da carreta
                </span>
                <input
                  value={form.placaCarreta ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      placaCarreta:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 uppercase"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Motorista</span>
                <input
                  value={form.motorista ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      motorista: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Transportadora
                </span>
                <input
                  value={form.transportadora ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      transportadora:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Operação</span>
                <input
                  value={form.operacao ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      operacao: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold">
                  Observações
                </span>
                <textarea
                  value={form.observacoes ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      observacoes: event.target.value,
                    })
                  }
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
              >
                {saving ? "Salvando..." : "Criar agendamento"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
          <form
            onSubmit={handleConfirm}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  Confirmação AGP
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Confirmar entrada
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {confirming.tipo} • {confirming.unidade}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Portaria de entrada
                </span>
                <select
                  value={confirmData.portariaEntrada}
                  onChange={(event) =>
                    setConfirmData({
                      ...confirmData,
                      portariaEntrada: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                >
                  <option>Portaria JAV 1</option>
                  <option>Portaria JAV 2</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Placa do cavalo
                </span>
                <input
                  value={confirmData.placaCavalo}
                  onChange={(event) =>
                    setConfirmData({
                      ...confirmData,
                      placaCavalo:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 uppercase"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Placa da carreta
                </span>
                <input
                  value={confirmData.placaCarreta}
                  onChange={(event) =>
                    setConfirmData({
                      ...confirmData,
                      placaCarreta:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 uppercase"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Motorista</span>
                <input
                  value={confirmData.motorista}
                  onChange={(event) =>
                    setConfirmData({
                      ...confirmData,
                      motorista: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Telefone</span>
                <input
                  value={confirmData.telefone}
                  onChange={(event) =>
                    setConfirmData({
                      ...confirmData,
                      telefone: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">
                  Transportadora
                </span>
                <input
                  value={confirmData.transportadora}
                  onChange={(event) =>
                    setConfirmData({
                      ...confirmData,
                      transportadora:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["fotoVeiculo", "Foto do veículo"],
                ["fotoContainer", "Foto do contêiner"],
                ["fotoDocumento", "Foto do documento"],
                ["fotoVisitante", "Foto da pessoa"],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="rounded-2xl border border-dashed border-white/15 bg-slate-950 p-4"
                >
                  <span className="text-sm font-black">
                    {label}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) =>
                      setFiles({
                        ...files,
                        [field]:
                          event.target.files?.[0] ?? null,
                      })
                    }
                    className="mt-3 block w-full text-sm text-slate-400"
                  />
                </label>
              ))}
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-bold">
                Observações da recepção
              </span>
              <textarea
                value={confirmData.observacoes}
                onChange={(event) =>
                  setConfirmData({
                    ...confirmData,
                    observacoes: event.target.value,
                  })
                }
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
              >
                {saving
                  ? "Confirmando..."
                  : "Confirmar entrada"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
