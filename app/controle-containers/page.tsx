"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  confirmContainerUnmount,
  mountContainerOnVehicle,
  moveContainerToStack,
  scheduleContainerExit,
} from "@/lib/containers";
import {
  carregarContainerCompleto,
  listarContainersAtivosUnificados,
  subscribeToContainerDomain,
  type ContainerUnifiedView,
} from "@/lib/container-service";
import { getActiveMovements } from "@/lib/movements";
import {
  listarPatios,
  listarQuadras,
  subscribeToPatios,
  type PatioTerminal,
  type QuadraTerminal,
} from "@/lib/patios";
import type {
  CondicaoContainer,
  EventoContainer,
  MotivoMovimentacaoContainer,
  VehicleMovement,
} from "@/types";

type ActionType = "move" | "mount" | "schedule" | "unmount" | null;

const statusClasses: Record<string, string> = {
  Recebido: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  "Aguardando Desmontagem":
    "border-amber-400/30 bg-amber-500/10 text-amber-200",
  Desmontado: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  "Na Pilha": "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  "Em Movimentação":
    "border-blue-400/30 bg-blue-500/10 text-blue-200",
  "Aguardando Programação":
    "border-slate-400/30 bg-slate-500/10 text-slate-200",
  "Programado para Saída":
    "border-orange-400/30 bg-orange-500/10 text-orange-200",
  Montado: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200",
  Saiu: "border-slate-400/30 bg-slate-500/10 text-slate-400",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
};

const formatPosition = (container: ContainerUnifiedView) =>
  container.posicao ||
  [
    container.pilha && `P${container.pilha}`,
    container.fila && `F${container.fila}`,
    container.altura &&
      `H${String(container.altura).padStart(2, "0")}`,
  ]
    .filter(Boolean)
    .join("-") ||
  "Sem posição";

export default function ControleContainersPage() {
  const [containers, setContainers] = useState<ContainerUnifiedView[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMovement[]>([]);
  const [patios, setPatios] = useState<PatioTerminal[]>([]);
  const [quadras, setQuadras] = useState<QuadraTerminal[]>([]);

  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [conditionFilter, setConditionFilter] = useState("Todas");

  const [selected, setSelected] = useState<ContainerUnifiedView | null>(null);
  const [timeline, setTimeline] = useState<EventoContainer[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [action, setAction] = useState<ActionType>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedUnit, setSelectedUnit] = useState("");
  const [patioId, setPatioId] = useState("");
  const [quadraId, setQuadraId] = useState("");
  const [pilha, setPilha] = useState("");
  const [fila, setFila] = useState("");
  const [altura, setAltura] = useState("1");

  const [motivo, setMotivo] =
    useState<MotivoMovimentacaoContainer>("Armazenamento inicial");
  const [observacao, setObservacao] = useState("");

  const [movementId, setMovementId] = useState("");
  const [conditionOut, setConditionOut] =
    useState<CondicaoContainer>("Não Informado");

  const loadData = async () => {
    try {
      setLoading(true);

      const [containerData, vehicleData, patioData, quadraData] =
        await Promise.all([
          listarContainersAtivosUnificados(),
          getActiveMovements(),
          listarPatios(),
          listarQuadras(),
        ]);

      setContainers(containerData);
      setVehicles(vehicleData);
      setPatios(patioData);
      setQuadras(quadraData);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o controle de contêineres.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribeDomain = subscribeToContainerDomain(loadData);
    const unsubscribePatios = subscribeToPatios(loadData);

    return () => {
      unsubscribeDomain();
      unsubscribePatios();
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return containers.filter((container) => {
      if (unitFilter !== "Todas" && container.unidade !== unitFilter) {
        return false;
      }

      if (statusFilter !== "Todos" && container.status !== statusFilter) {
        return false;
      }

      if (
        conditionFilter !== "Todas" &&
        container.condicao !== conditionFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        container.numeroContainer,
        container.cliente,
        container.armador,
        container.tipoContainer,
        container.placaAtual,
        container.placaEntrada,
        container.posicao,
        container.patio,
        container.operacao,
        container.destino,
        container.motorista,
        container.transportadora,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedQuery),
        );
    });
  }, [containers, query, unitFilter, statusFilter, conditionFilter]);

  const totals = useMemo(
    () => ({
      total: containers.length,
      jav1: containers.filter((item) => item.unidade === "JAV 1").length,
      jav2: containers.filter((item) => item.unidade === "JAV 2").length,
      stack: containers.filter((item) => item.status === "Na Pilha").length,
      scheduled: containers.filter(
        (item) => item.status === "Programado para Saída",
      ).length,
      mounted: containers.filter((item) => item.status === "Montado").length,
    }),
    [containers],
  );

  const availablePatios = useMemo(
    () =>
      patios.filter(
        (patio) => !selectedUnit || patio.unidade === selectedUnit,
      ),
    [patios, selectedUnit],
  );

  const availableQuadras = useMemo(
    () =>
      quadras.filter(
        (quadra) =>
          quadra.patioId === patioId &&
          quadra.ativo &&
          quadra.permiteArmazenamento &&
          quadra.status !== "Em Manutenção" &&
          quadra.status !== "Bloqueada" &&
          quadra.status !== "Inativa" &&
          quadra.ocupacao < quadra.capacidadeOperacional,
      ),
    [quadras, patioId],
  );

  const selectedPatio = useMemo(
    () => patios.find((patio) => patio.id === patioId) ?? null,
    [patios, patioId],
  );

  const selectedQuadra = useMemo(
    () => quadras.find((quadra) => quadra.id === quadraId) ?? null,
    [quadras, quadraId],
  );

  const openAction = (
    container: ContainerUnifiedView,
    nextAction: ActionType,
  ) => {
    setSelected(container);
    setAction(nextAction);
    setMessage("");
    setError("");

    setSelectedUnit(container.unidade);
    setPatioId("");
    setQuadraId("");
    setPilha(container.pilha ?? "");
    setFila(container.fila ?? "");
    setAltura(String(container.altura ?? 1));

    setMotivo(
      container.posicao ? "Reposicionamento" : "Armazenamento inicial",
    );
    setObservacao("");
    setMovementId("");
    setConditionOut(container.condicao ?? "Não Informado");
  };

  const openDetails = async (container: ContainerUnifiedView) => {
    try {
      setSelected(container);
      setDetailsOpen(true);
      setTimeline([]);
      setError("");

      const complete = await carregarContainerCompleto(container.id);
      setSelected(complete.container);
      setTimeline(complete.timeline);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o histórico.",
      );
    }
  };

  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit);
    setPatioId("");
    setQuadraId("");
  };

  const handlePatioChange = (id: string) => {
    setPatioId(id);
    setQuadraId("");
  };

  const handleAction = async (event: FormEvent) => {
    event.preventDefault();

    if (!selected || !action) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (action === "unmount") {
        await confirmContainerUnmount({
          containerId: selected.id,
          movimentoId: selected.movimentoAtualId ?? undefined,
          observacao,
        });
      }

      if (action === "move") {
        if (!selectedUnit) {
          throw new Error("Selecione a unidade.");
        }

        if (!selectedPatio) {
          throw new Error("Selecione o pátio.");
        }

        if (!selectedQuadra) {
          throw new Error("Selecione a quadra.");
        }

        await moveContainerToStack({
          containerId: selected.id,
          unidade: selectedUnit,
          patio: selectedPatio.nome,
          quadraId: selectedQuadra.id,
          quadra: selectedQuadra.nome,
          pilha,
          fila,
          altura: Number(altura),
          motivo,
          observacao,
          movimentoId: selected.movimentoAtualId ?? null,
        });
      }

      if (action === "schedule") {
        await scheduleContainerExit({
          containerId: selected.id,
          movimentoId: selected.movimentoAtualId ?? null,
          motivo: motivo || "Programação de saída",
          observacao,
        });
      }

      if (action === "mount") {
        const vehicle = vehicles.find((item) => item.id === movementId);

        if (!vehicle) {
          throw new Error("Selecione o veículo que receberá o contêiner.");
        }

        await mountContainerOnVehicle({
          containerId: selected.id,
          movimentoId: vehicle.id,
          placaCavalo: vehicle.placaCavalo,
          placaCarreta: vehicle.placaCarreta,
          condicaoSaida: conditionOut,
          observacao,
        });
      }

      setAction(null);
      setMessage("Operação registrada com sucesso.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao registrar a operação.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_28%),#020617] text-slate-100">
      <Sidebar />

      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[30px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-400">
              Operação de terminal
            </p>

            <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">
                  Controle de Contêineres
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Estoque vivo do pátio, desmontagem, pateamento,
                  movimentação, programação, montagem e histórico operacional.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
                Atualização em tempo real
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["No terminal", totals.total, "text-slate-50"],
              ["JAV 1", totals.jav1, "text-emerald-300"],
              ["JAV 2", totals.jav2, "text-cyan-300"],
              ["Na pilha", totals.stack, "text-violet-300"],
              ["Programados", totals.scheduled, "text-orange-300"],
              ["Montados", totals.mounted, "text-fuchsia-300"],
            ].map(([label, value, valueClass]) => (
              <div
                key={String(label)}
                className="rounded-3xl border border-white/10 bg-slate-900/65 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </p>

                <p className={`mt-3 text-4xl font-black ${valueClass}`}>
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900/55 p-4 backdrop-blur sm:p-6">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_180px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar contêiner, cliente, armador, placa ou posição"
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none transition focus:border-emerald-400/60"
              />

              <select
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              >
                <option>Todas</option>
                <option>JAV 1</option>
                <option>JAV 2</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              >
                <option>Todos</option>
                <option>Recebido</option>
                <option>Aguardando Desmontagem</option>
                <option>Desmontado</option>
                <option>Na Pilha</option>
                <option>Programado para Saída</option>
                <option>Montado</option>
              </select>

              <select
                value={conditionFilter}
                onChange={(event) => setConditionFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              >
                <option>Todas</option>
                <option>Cheio</option>
                <option>Vazio</option>
                <option>Não Informado</option>
              </select>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            ) : null}

            {error && !action ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-6">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                  Carregando estoque de contêineres...
                </div>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                  Nenhum contêiner ativo encontrado.
                </div>
              ) : null}

              {!loading && filtered.length > 0 ? (
                <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((container) => (
                    <article
                      key={container.id}
                      className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Contêiner
                          </p>

                          <h2 className="mt-2 text-2xl font-black tracking-wide text-slate-50">
                            {container.numeroContainer}
                          </h2>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${
                              statusClasses[container.status] ??
                              "border-white/10 bg-slate-800 text-slate-200"
                            }`}
                          >
                            {container.status}
                          </span>

                          <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            {container.etapa.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Unidade</p>
                          <p className="mt-1 font-bold">{container.unidade}</p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Condição</p>
                          <p className="mt-1 font-bold">{container.condicao}</p>
                        </div>

                        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/5 p-3">
                          <p className="text-xs text-violet-200/60">
                            Posição atual
                          </p>
                          <p className="mt-1 font-black text-violet-200">
                            {formatPosition(container)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Pátio</p>
                          <p className="mt-1 font-bold">
                            {container.patio || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Cliente</p>
                          <p className="mt-1 truncate font-bold">
                            {container.cliente || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Armador</p>
                          <p className="mt-1 truncate font-bold">
                            {container.armador || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-3">
                        <p className="text-xs text-cyan-200/60">
                          Veículo vinculado
                        </p>
                        <p className="mt-1 font-bold text-cyan-100">
                          {container.placaAtual ||
                            container.placaEntrada ||
                            "Sem veículo vinculado"}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Operação</p>
                          <p className="mt-1 truncate font-bold">
                            {container.operacao || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">Destino</p>
                          <p className="mt-1 truncate font-bold">
                            {container.destino || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openDetails(container)}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold transition hover:bg-slate-800"
                        >
                          Histórico
                        </button>

                        <button
                          onClick={() => openAction(container, "move")}
                          disabled={
                            container.status === "Montado" ||
                            container.status === "Saiu"
                          }
                          className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Movimentar
                        </button>

                        <button
                          onClick={() => openAction(container, "unmount")}
                          disabled={
                            container.status === "Desmontado" ||
                            container.status === "Na Pilha" ||
                            container.status === "Montado" ||
                            container.status === "Saiu"
                          }
                          className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Desmontar
                        </button>

                        <button
                          onClick={() => openAction(container, "schedule")}
                          disabled={
                            container.status === "Montado" ||
                            container.status === "Saiu"
                          }
                          className="rounded-2xl border border-orange-400/20 bg-orange-500/10 px-3 py-3 text-sm font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Programar
                        </button>

                        <button
                          onClick={() => openAction(container, "mount")}
                          disabled={
                            container.status === "Montado" ||
                            container.status === "Saiu"
                          }
                          className="col-span-2 rounded-2xl bg-emerald-500 px-3 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Montar em veículo
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {detailsOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Linha do tempo
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {selected.numeroContainer}
                </h2>
              </div>

              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-slate-400">
                  Nenhum evento registrado.
                </div>
              ) : (
                timeline.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/65 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-slate-100">
                          {event.tipoEvento}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {event.statusAnterior || "Início"} →{" "}
                          {event.statusNovo}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500">
                        {formatDate(event.criadoEm)}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p className="text-slate-400">
                        Origem:{" "}
                        <span className="font-bold text-slate-200">
                          {event.posicaoAnterior || "-"}
                        </span>
                      </p>

                      <p className="text-slate-400">
                        Destino:{" "}
                        <span className="font-bold text-slate-200">
                          {event.posicaoNova || "-"}
                        </span>
                      </p>

                      <p className="text-slate-400">
                        Usuário:{" "}
                        <span className="font-bold text-slate-200">
                          {event.usuarioNome || "-"}
                        </span>
                      </p>

                      <p className="text-slate-400">
                        Motivo:{" "}
                        <span className="font-bold text-slate-200">
                          {event.motivo || "-"}
                        </span>
                      </p>
                    </div>

                    {event.observacao ? (
                      <p className="mt-3 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                        {event.observacao}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {action && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur">
          <form
            onSubmit={handleAction}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Ação operacional
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {selected.numeroContainer}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setAction(null)}
                className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            {action === "unmount" ? (
              <div className="mt-6">
                <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Confirme que o contêiner foi fisicamente desmontado do
                  veículo.
                </p>
              </div>
            ) : null}

            {action === "move" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  Selecione o endereço operacional na sequência: Unidade →
                  Pátio → Quadra → Pilha → Fila → Altura.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Unidade
                    </span>

                    <select
                      required
                      value={selectedUnit}
                      onChange={(event) =>
                        handleUnitChange(event.target.value)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    >
                      <option value="">Selecione</option>
                      <option>JAV 1</option>
                      <option>JAV 2</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Pátio
                    </span>

                    <select
                      required
                      value={patioId}
                      onChange={(event) =>
                        handlePatioChange(event.target.value)
                      }
                      disabled={!selectedUnit}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none disabled:opacity-50"
                    >
                      <option value="">Selecione</option>
                      {availablePatios.map((patio) => (
                        <option key={patio.id} value={patio.id}>
                          {patio.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Quadra disponível
                    </span>

                    <select
                      required
                      value={quadraId}
                      onChange={(event) => setQuadraId(event.target.value)}
                      disabled={!patioId}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none disabled:opacity-50"
                    >
                      <option value="">Selecione</option>
                      {availableQuadras.map((quadra) => (
                        <option key={quadra.id} value={quadra.id}>
                          {quadra.nome} — {quadra.livres} vagas livres —{" "}
                          {quadra.status}
                        </option>
                      ))}
                    </select>

                    {patioId && availableQuadras.length === 0 ? (
                      <p className="mt-2 text-xs text-rose-300">
                        Não há quadras disponíveis neste pátio.
                      </p>
                    ) : null}
                  </label>

                  {selectedQuadra ? (
                    <div className="sm:col-span-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                      <p className="font-black text-emerald-100">
                        {selectedQuadra.nome}
                      </p>

                      <p className="mt-1 text-sm text-emerald-200/75">
                        Ocupação: {selectedQuadra.ocupacao} de{" "}
                        {selectedQuadra.capacidadeOperacional} • Livres:{" "}
                        {selectedQuadra.livres}
                      </p>
                    </div>
                  ) : null}

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Pilha
                    </span>

                    <input
                      required
                      value={pilha}
                      onChange={(event) => setPilha(event.target.value)}
                      placeholder="03"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Fila
                    </span>

                    <input
                      required
                      value={fila}
                      onChange={(event) => setFila(event.target.value)}
                      placeholder="05"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Altura
                    </span>

                    <select
                      value={altura}
                      onChange={(event) => setAltura(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <option key={value} value={value}>
                          {value} de alto
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Motivo
                    </span>

                    <select
                      value={motivo}
                      onChange={(event) =>
                        setMotivo(
                          event.target
                            .value as MotivoMovimentacaoContainer,
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    >
                      <option>Armazenamento inicial</option>
                      <option>Organização de pátio</option>
                      <option>Separação para entrega</option>
                      <option>Separação para coleta</option>
                      <option>Reposicionamento</option>
                      <option>Carregamento</option>
                      <option>Descarregamento</option>
                      <option>Inspeção</option>
                      <option>Outro</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {action === "schedule" ? (
              <div className="mt-6">
                <label>
                  <span className="mb-2 block text-xs font-bold text-slate-400">
                    Motivo da programação
                  </span>

                  <select
                    value={motivo}
                    onChange={(event) =>
                      setMotivo(
                        event.target
                          .value as MotivoMovimentacaoContainer,
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                  >
                    <option>Separação para entrega</option>
                    <option>Separação para coleta</option>
                    <option>Carregamento</option>
                    <option>Outro</option>
                  </select>
                </label>
              </div>
            ) : null}

            {action === "mount" ? (
              <div className="mt-6 space-y-4">
                <label>
                  <span className="mb-2 block text-xs font-bold text-slate-400">
                    Veículo dentro da unidade
                  </span>

                  <select
                    required
                    value={movementId}
                    onChange={(event) => setMovementId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                  >
                    <option value="">Selecione</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.placaCavalo} — {vehicle.motorista} —{" "}
                        {vehicle.unidade}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold text-slate-400">
                    Condição de saída
                  </span>

                  <select
                    value={conditionOut}
                    onChange={(event) =>
                      setConditionOut(
                        event.target.value as CondicaoContainer,
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                  >
                    <option>Cheio</option>
                    <option>Vazio</option>
                    <option>Não Informado</option>
                  </select>
                </label>
              </div>
            ) : null}

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold text-slate-400">
                Observação
              </span>

              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                rows={3}
                placeholder="Opcional"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
              />
            </label>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-2xl bg-emerald-500 px-4 py-4 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Confirmar operação"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
