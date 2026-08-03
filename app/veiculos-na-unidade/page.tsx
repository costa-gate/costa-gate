"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import {
  finalizeMovement,
  formatPermanencia,
  getActiveMovements,
  subscribeToMovements,
} from "@/lib/movements";
import type { VehicleMovement } from "@/types";

type UnidadeFilter = "Todas" | "JAV 1" | "JAV 2";
type StatusFilter =
  | "Todos"
  | "Na Portaria"
  | "Em Operação"
  | "Aguardando Saída"
  | "Finalizado";
type QuickFilter =
  | "Todos"
  | "Contêiner"
  | "Material"
  | "Visitante"
  | "Prestador"
  | "Veículo leve"
  | "Acima de 1h"
  | "Acima de 2h";

const quickFilters: QuickFilter[] = [
  "Todos",
  "Contêiner",
  "Material",
  "Visitante",
  "Prestador",
  "Veículo leve",
  "Acima de 1h",
  "Acima de 2h",
];

const normalizeText = (value?: string | null) =>
  String(value ?? "").trim();

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "-";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR");
};

const getAccessLabel = (movement: VehicleMovement) => {
  const type = normalizeText(movement.tipoAcesso);

  if (type === "Caminhão Operacional") {
    return normalizeText(movement.numeroContainer)
      ? "Contêiner"
      : "Caminhão";
  }

  if (type === "Entrega de Material") return "Material";
  if (type === "Visitante") return "Visitante";
  if (type === "Prestador de Serviço") return "Prestador";
  if (type === "Veículo Leve") return "Veículo leve";
  if (type === "Outro") return "Outro";

  return type || "Acesso geral";
};

const getStageLabel = (movement: VehicleMovement) => {
  if (movement.status === "Aguardando Saída") return "Aguardando saída";
  if (movement.status === "Em Operação") return "Em operação";
  if (movement.status === "Finalizado") return "Finalizado";
  return "Gate";
};

const getDestinationLabel = (movement: VehicleMovement) => {
  const access = getAccessLabel(movement);

  if (access === "Material") {
    return (
      normalizeText(movement.setorDestino) ||
      normalizeText(movement.responsavelRecebimento) ||
      "Recebimento"
    );
  }

  if (access === "Visitante") {
    return (
      normalizeText(movement.pessoaVisitada) ||
      normalizeText(movement.cliente) ||
      "Visita"
    );
  }

  if (access === "Prestador") {
    return normalizeText(movement.cliente) || "Área operacional";
  }

  return normalizeText(movement.cliente) || "Terminal";
};

export default function VeiculosNaUnidadePage() {
  const [query, setQuery] = useState("");
  const [filtroUnidade, setFiltroUnidade] =
    useState<UnidadeFilter>("Todas");
  const [filtroStatus, setFiltroStatus] =
    useState<StatusFilter>("Todos");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("Todos");

  const [data, setData] = useState<VehicleMovement[]>([]);
  const [selected, setSelected] = useState<VehicleMovement | null>(null);
  const [confirmingExit, setConfirmingExit] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [, setClockTick] = useState(0);

  const loadMovements = async () => {
    try {
      setIsLoading(true);
      const loaded = await getActiveMovements();
      setData(loaded);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao buscar veículos.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();

    const unsubscribe = subscribeToMovements(() => {
      loadMovements();
    });

    const timer = window.setInterval(() => {
      setClockTick((current) => current + 1);
    }, 60_000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const getHoursInside = (iso: string) =>
    Math.max(
      0,
      (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60),
    );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return data.filter((movement) => {
      if (
        filtroUnidade !== "Todas" &&
        movement.unidade !== filtroUnidade
      ) {
        return false;
      }

      if (
        filtroStatus !== "Todos" &&
        movement.status !== filtroStatus
      ) {
        return false;
      }

      const accessLabel = getAccessLabel(movement);
      const hours = getHoursInside(movement.entrada);

      if (
        quickFilter !== "Todos" &&
        quickFilter !== "Acima de 1h" &&
        quickFilter !== "Acima de 2h" &&
        accessLabel !== quickFilter
      ) {
        return false;
      }

      if (quickFilter === "Acima de 1h" && hours < 1) return false;
      if (quickFilter === "Acima de 2h" && hours < 2) return false;

      if (!q) return true;

      return [
        movement.placaCavalo,
        movement.placaCarreta,
        movement.motorista,
        movement.cliente,
        movement.numeroContainer,
        movement.operacao,
        movement.transportadora,
        movement.nomeVisitante,
        movement.documentoVisitante,
        movement.setorDestino,
        accessLabel,
        getStageLabel(movement),
        getDestinationLabel(movement),
      ].some((value) => normalizeText(value).toLowerCase().includes(q));
    });
  }, [
    data,
    query,
    filtroUnidade,
    filtroStatus,
    quickFilter,
  ]);

  const openDetails = (movement: VehicleMovement) => {
    setSelected(movement);
    setConfirmingExit(false);
    setErrorMessage("");
  };

  const closeDetails = () => {
    setSelected(null);
    setConfirmingExit(false);
    setErrorMessage("");
  };

  const confirmSaida = async () => {
    if (!selected) return;

    setIsFinalizing(true);
    setErrorMessage("");

    try {
      await finalizeMovement(selected.id);
      setData((current) =>
        current.filter((movement) => movement.id !== selected.id),
      );
      setSelected(null);
      setConfirmingExit(false);
      setSuccessMessage("Saída finalizada com sucesso.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao finalizar saída.",
      );
    } finally {
      setIsFinalizing(false);
    }
  };

  const getPermanenceClasses = (iso: string) => {
    const hours = getHoursInside(iso);

    if (hours >= 24) {
      return "border-rose-400/30 bg-rose-500/15 text-rose-200";
    }

    if (hours >= 2) {
      return "border-orange-400/30 bg-orange-500/15 text-orange-200";
    }

    if (hours >= 1) {
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    }

    if (hours >= 0.5) {
      return "border-yellow-400/30 bg-yellow-500/15 text-yellow-200";
    }

    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  };

  const getStatusClasses = (status: VehicleMovement["status"]) => {
    if (status === "Aguardando Saída") {
      return "border-cyan-400/30 bg-cyan-500/15 text-cyan-200";
    }

    if (status === "Em Operação") {
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    }

    if (status === "Finalizado") {
      return "border-slate-400/30 bg-slate-500/15 text-slate-200";
    }

    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  };

  const getStageClasses = (movement: VehicleMovement) => {
    if (movement.status === "Aguardando Saída") {
      return "border-violet-400/30 bg-violet-500/15 text-violet-200";
    }

    if (movement.status === "Em Operação") {
      return "border-blue-400/30 bg-blue-500/15 text-blue-200";
    }

    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  };

  const totalJav1 = data.filter(
    (movement) => movement.unidade === "JAV 1",
  ).length;
  const totalJav2 = data.filter(
    (movement) => movement.unidade === "JAV 2",
  ).length;
  const totalAcima24h = data.filter(
    (movement) => getHoursInside(movement.entrada) >= 24,
  ).length;
  const totalGate = data.filter(
    (movement) => getStageLabel(movement) === "Gate",
  ).length;
  const totalOperacao = data.filter(
    (movement) => movement.status === "Em Operação",
  ).length;
  const totalAguardandoSaida = data.filter(
    (movement) => movement.status === "Aguardando Saída",
  ).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />

      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
                  Central operacional
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-50">
                  Veículos na Unidade
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Visão em tempo real de tudo que entrou e ainda permanece
                  dentro do terminal.
                </p>
              </div>

              <Link
                href="/"
                className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900"
              >
                Voltar
              </Link>
            </div>
          </header>

          <section className="mt-6 rounded-[32px] border border-white/10 bg-slate-900/50 p-4 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
              <StatCard
                title="Veículos ativos"
                value={data.length}
                className="border-white/10 bg-slate-950/70 text-slate-50"
              />
              <StatCard
                title="JAV 1"
                value={totalJav1}
                className="border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              />
              <StatCard
                title="JAV 2"
                value={totalJav2}
                className="border-cyan-400/20 bg-cyan-500/10 text-cyan-300"
              />
              <StatCard
                title="No Gate"
                value={totalGate}
                className="border-teal-400/20 bg-teal-500/10 text-teal-300"
              />
              <StatCard
                title="Em operação"
                value={totalOperacao}
                className="border-blue-400/20 bg-blue-500/10 text-blue-300"
              />
              <StatCard
                title="Aguardando saída"
                value={totalAguardandoSaida}
                className="border-violet-400/20 bg-violet-500/10 text-violet-300"
              />
              <StatCard
                title="Acima de 24h"
                value={totalAcima24h}
                className="border-rose-400/20 bg-rose-500/10 text-rose-300"
              />
            </div>

            <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <input
                placeholder="Buscar placa, motorista, cliente, contêiner, destino ou operação"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 xl:max-w-3xl"
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={filtroUnidade}
                  onChange={(event) =>
                    setFiltroUnidade(event.target.value as UnidadeFilter)
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option>Todas</option>
                  <option>JAV 1</option>
                  <option>JAV 2</option>
                </select>

                <select
                  value={filtroStatus}
                  onChange={(event) =>
                    setFiltroStatus(event.target.value as StatusFilter)
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option>Todos</option>
                  <option>Na Portaria</option>
                  <option>Em Operação</option>
                  <option>Aguardando Saída</option>
                  <option>Finalizado</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {quickFilters.map((filter) => {
                const active = quickFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setQuickFilter(filter)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black transition ${
                      active
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                        : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            {successMessage ? (
              <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            {errorMessage && !selected ? (
              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">
                  Carregando veículos...
                </div>
              ) : null}

              {!isLoading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">
                  Nenhum veículo ativo encontrado.
                </div>
              ) : null}

              {!isLoading && filtered.length > 0 ? (
                <div className="hidden w-full overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 lg:block">
                  <table className="min-w-[1500px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-4">Placa</th>
                        <th className="px-4 py-4">Motorista</th>
                        <th className="px-4 py-4">Tipo</th>
                        <th className="px-4 py-4">Cliente/Empresa</th>
                        <th className="px-4 py-4">Contêiner</th>
                        <th className="px-4 py-4">Operação</th>
                        <th className="px-4 py-4">Etapa</th>
                        <th className="px-4 py-4">Destino</th>
                        <th className="px-4 py-4">Unidade</th>
                        <th className="px-4 py-4">Entrada</th>
                        <th className="px-4 py-4">Permanência</th>
                        <th className="px-4 py-4">Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((movement) => (
                        <tr
                          key={movement.id}
                          onClick={() => openDetails(movement)}
                          className="cursor-pointer border-t border-white/5 text-slate-200 transition hover:bg-white/[0.035]"
                        >
                          <td className="px-4 py-4 font-bold text-slate-50">
                            {normalizeText(movement.placaCavalo) || "-"}
                            {normalizeText(movement.placaCarreta) ? (
                              <span className="mt-1 block text-xs font-normal text-slate-500">
                                Carreta: {movement.placaCarreta}
                              </span>
                            ) : null}
                          </td>

                          <td className="px-4 py-4">
                            {normalizeText(movement.motorista) || "-"}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                              {getAccessLabel(movement)}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {normalizeText(movement.cliente) ||
                              normalizeText(movement.transportadora) ||
                              "-"}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {normalizeText(movement.numeroContainer) || "-"}
                          </td>

                          <td className="max-w-[220px] px-4 py-4">
                            <span className="line-clamp-2">
                              {normalizeText(movement.operacao) || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStageClasses(
                                movement,
                              )}`}
                            >
                              {getStageLabel(movement)}
                            </span>
                          </td>

                          <td className="px-4 py-4 font-semibold text-cyan-200">
                            {getDestinationLabel(movement)}
                          </td>

                          <td className="px-4 py-4">
                            {movement.unidade}
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
                            {formatDateTime(movement.entrada)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPermanenceClasses(
                                movement.entrada,
                              )}`}
                            >
                              {formatPermanencia(
                                movement.entrada,
                                undefined,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetails(movement);
                              }}
                              className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/20"
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {!isLoading && filtered.length > 0 ? (
                <div className="grid gap-4 lg:hidden">
                  {filtered.map((movement) => (
                    <button
                      key={movement.id}
                      type="button"
                      onClick={() => openDetails(movement)}
                      className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-left transition hover:border-emerald-400/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
                            {movement.unidade}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStageClasses(
                              movement,
                            )}`}
                          >
                            {getStageLabel(movement)}
                          </span>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getPermanenceClasses(
                            movement.entrada,
                          )}`}
                        >
                          {formatPermanencia(
                            movement.entrada,
                            undefined,
                          )}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-black text-slate-50">
                        {normalizeText(movement.placaCavalo) || "Sem placa"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {normalizeText(movement.motorista) || "Sem condutor"} ·{" "}
                        {getAccessLabel(movement)}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MobileInfo
                          label="Cliente/Empresa"
                          value={
                            normalizeText(movement.cliente) ||
                            normalizeText(movement.transportadora) ||
                            "-"
                          }
                        />
                        <MobileInfo
                          label="Destino"
                          value={getDestinationLabel(movement)}
                        />
                        <MobileInfo
                          label="Contêiner"
                          value={
                            normalizeText(movement.numeroContainer) || "-"
                          }
                        />
                        <MobileInfo
                          label="Operação"
                          value={normalizeText(movement.operacao) || "-"}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Fechar detalhes"
            className="absolute inset-0"
            onClick={closeDetails}
          />

          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
                  Controle operacional
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-50">
                  {normalizeText(selected.placaCavalo) || "Veículo"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {getAccessLabel(selected)} · {selected.unidade}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <DetailCard
                label="Etapa"
                value={getStageLabel(selected)}
              />
              <DetailCard
                label="Permanência"
                value={formatPermanencia(selected.entrada, undefined)}
              />
              <DetailCard
                label="Destino"
                value={getDestinationLabel(selected)}
              />
              <DetailCard
                label="Status"
                value={selected.status}
              />
            </div>

            <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Identificação
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Placa cavalo"
                  value={selected.placaCavalo}
                />
                <DetailRow
                  label="Placa carreta"
                  value={selected.placaCarreta}
                />
                <DetailRow
                  label="Motorista/Visitante"
                  value={
                    selected.motorista || selected.nomeVisitante
                  }
                />
                <DetailRow
                  label="Telefone"
                  value={selected.telefone}
                />
                <DetailRow
                  label="Empresa"
                  value={
                    selected.transportadora ||
                    selected.empresaVisitante
                  }
                />
                <DetailRow
                  label="Cliente"
                  value={selected.cliente}
                />
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Operação
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Tipo"
                  value={getAccessLabel(selected)}
                />
                <DetailRow
                  label="Operação"
                  value={selected.operacao}
                />
                <DetailRow
                  label="Contêiner"
                  value={selected.numeroContainer}
                />
                <DetailRow
                  label="Armador"
                  value={selected.armador}
                />
                <DetailRow
                  label="Entrada"
                  value={formatDateTime(selected.entrada)}
                />
                <DetailRow
                  label="Portaria"
                  value={selected.portariaEntrada}
                />
                <DetailRow
                  label="Setor de destino"
                  value={selected.setorDestino}
                />
                <DetailRow
                  label="Responsável"
                  value={selected.responsavelRecebimento}
                />
              </div>
            </section>

            {normalizeText(selected.observacoes) ? (
              <section className="mt-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Observações
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {selected.observacoes}
                </p>
              </section>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6">
              {!confirmingExit ? (
                <button
                  type="button"
                  onClick={() => setConfirmingExit(true)}
                  className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  Finalizar saída
                </button>
              ) : (
                <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="font-bold text-amber-100">
                    Confirmar saída deste acesso?
                  </p>
                  <p className="mt-1 text-sm text-amber-200/70">
                    O registro será retirado da lista de veículos ativos.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingExit(false)}
                      className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200"
                    >
                      Voltar
                    </button>

                    <button
                      type="button"
                      onClick={confirmSaida}
                      disabled={isFinalizing}
                      className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isFinalizing
                        ? "Finalizando..."
                        : "Confirmar saída"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-3xl border p-4 sm:p-5 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">
        {title}
      </p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function MobileInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-100">
        {value || "-"}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-200">
        {normalizeText(value) || "-"}
      </p>
    </div>
  );
}
