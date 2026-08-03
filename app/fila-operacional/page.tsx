"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  cancelContainerReservation,
  confirmReservedContainerExecution,
  createContainerFromMovement,
  getContainerByNumber,
  reserveContainerPosition,
} from "@/lib/containers";
import {
  listarContainersAtivosUnificados,
  subscribeToContainerDomain,
  type ContainerUnifiedView,
} from "@/lib/container-service";
import {
  listarQuadras,
  subscribeToPatios,
  type QuadraTerminal,
} from "@/lib/patios";
import { supabase } from "@/lib/supabase";
import type { Unidade } from "@/types";

type DatabaseRow = Record<string, unknown>;

type EtapaFila = "AGUARDANDO_POSICAO" | "AGUARDANDO_EXECUCAO";

type ItemFila = ContainerUnifiedView;

type TarefaMontagem = {
  id: string;
  unidade: string;
  placaCavalo: string;
  placaCarreta?: string | null;
  motorista?: string | null;
  transportadora?: string | null;
  cliente?: string | null;
  entradaEm?: string | null;
  etapaOperacional: "AGUARDANDO_CONFERENTE" | "AGUARDANDO_OPERADOR";
  containerMontagem?: string | null;
  instrucaoMontagem?: string | null;
  justificativaEntrada?: string | null;
};

type PosicaoBloqueada = {
  containerId: string;
  quadraId: string;
  pilha: number;
  fila: number;
  altura: number;
  tipo: "OCUPADA" | "RESERVADA";
};

type FormReserva = {
  quadraId: string;
  pilha: number;
  fila: number;
  altura: number;
  observacao: string;
};

const PILHAS_PADRAO = 20;
const FILAS_PADRAO = 20;
const ALTURA_MAXIMA = 6;

const text = (value: unknown, fallback = "") =>
  value === null || value === undefined ? fallback : String(value);

const optionalText = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? null
    : String(value);

const optionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const numericSlot = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBlockedPosition = (
  row: DatabaseRow,
  mode: "OCUPADA" | "RESERVADA",
): PosicaoBloqueada | null => {
  const quadraId =
    mode === "OCUPADA"
      ? optionalText(row.quadra_id)
      : optionalText(row.quadra_reservada_id);

  const pilha =
    mode === "OCUPADA"
      ? numericSlot(row.pilha)
      : numericSlot(row.pilha_reservada);

  const fila =
    mode === "OCUPADA"
      ? numericSlot(row.fila)
      : numericSlot(row.fila_reservada);

  const altura =
    mode === "OCUPADA"
      ? optionalNumber(row.altura)
      : optionalNumber(row.altura_reservada);

  if (!quadraId || !pilha || !fila || !altura) return null;

  return {
    containerId: text(row.id),
    quadraId,
    pilha,
    fila,
    altura,
    tipo: mode,
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR");
};

const elapsedMinutes = (value?: string | null) => {
  if (!value) return 0;

  const start = new Date(value).getTime();

  if (Number.isNaN(start)) return 0;

  return Math.max(0, Math.floor((Date.now() - start) / 60_000));
};

const positionLabel = (
  pilha: number,
  fila: number,
  altura: number,
) =>
  `P${String(pilha).padStart(2, "0")}-F${String(fila).padStart(
    2,
    "0",
  )}-H${String(altura).padStart(2, "0")}`;

const getStage = (item: ItemFila): EtapaFila =>
  item.etapa === "AGUARDANDO_OPERADOR"
    ? "AGUARDANDO_EXECUCAO"
    : "AGUARDANDO_POSICAO";

const stageLabel = (item: ItemFila) =>
  getStage(item) === "AGUARDANDO_EXECUCAO"
    ? "Aguardando operador"
    : "Aguardando conferente";

const priorityClass = (minutes: number) => {
  if (minutes >= 120) {
    return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }

  if (minutes >= 60) {
    return "border-orange-400/30 bg-orange-500/10 text-orange-200";
  }

  if (minutes >= 30) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
};

const stageClass = (item: ItemFila) =>
  getStage(item) === "AGUARDANDO_EXECUCAO"
    ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
    : "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";

const findFirstOperationalSlot = (
  quadraId: string,
  blockedPositions: PosicaoBloqueada[],
) => {
  const usedByBase = new Map<string, Set<number>>();

  for (const position of blockedPositions) {
    if (position.quadraId !== quadraId) continue;

    const key = `${position.pilha}-${position.fila}`;
    const heights = usedByBase.get(key) ?? new Set<number>();

    heights.add(position.altura);
    usedByBase.set(key, heights);
  }

  for (let pilha = 1; pilha <= PILHAS_PADRAO; pilha += 1) {
    for (let fila = 1; fila <= FILAS_PADRAO; fila += 1) {
      const key = `${pilha}-${fila}`;
      const heights = usedByBase.get(key) ?? new Set<number>();

      for (let altura = 1; altura <= ALTURA_MAXIMA; altura += 1) {
        if (!heights.has(altura)) {
          return { pilha, fila, altura };
        }
      }
    }
  }

  return { pilha: 1, fila: 1, altura: 1 };
};

export default function FilaOperacionalPage() {
  const [queue, setQueue] = useState<ItemFila[]>([]);
  const [mountingQueue, setMountingQueue] = useState<TarefaMontagem[]>([]);
  const [quadras, setQuadras] = useState<QuadraTerminal[]>([]);
  const [blockedPositions, setBlockedPositions] = useState<
    PosicaoBloqueada[]
  >([]);

  const [selectedItem, setSelectedItem] =
    useState<ItemFila | null>(null);

  const [executionItem, setExecutionItem] =
    useState<ItemFila | null>(null);

  const [form, setForm] = useState<FormReserva>({
    quadraId: "",
    pilha: 1,
    fila: 1,
    altura: 1,
    observacao: "",
  });

  const [executionObservation, setExecutionObservation] =
    useState("");

  const [selectedMountingTask, setSelectedMountingTask] =
    useState<TarefaMontagem | null>(null);
  const [mountingContainer, setMountingContainer] = useState("");
  const [mountingInstruction, setMountingInstruction] = useState("");
  const [completingMountingTask, setCompletingMountingTask] =
    useState<TarefaMontagem | null>(null);

  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("Todas");
  const [stageFilter, setStageFilter] = useState("Todos");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        containerData,
        { data: mountingData, error: mountingError },
        quadraData,
      ] = await Promise.all([
        listarContainersAtivosUnificados(),

        supabase
          .from("movimentacoes")
          .select(`
            id,
            unidade,
            placa_cavalo,
            placa_carreta,
            motorista,
            transportadora,
            cliente,
            entrada_em,
            etapa_operacional,
            container_montagem,
            instrucao_montagem,
            justificativa_entrada
          `)
          .eq("exige_fila_operacional", true)
          .in("etapa_operacional", [
            "AGUARDANDO_CONFERENTE",
            "AGUARDANDO_OPERADOR"
          ])
          .order("entrada_em", { ascending: true }),

        listarQuadras(),
      ]);

      if (mountingError) throw new Error(mountingError.message);

      const operationalQueue = containerData
        .filter(
          (container) =>
            container.etapa === "AGUARDANDO_CONFERENTE" ||
            container.etapa === "AGUARDANDO_OPERADOR",
        )
        .sort(
          (a, b) =>
            new Date(a.entradaEm).getTime() -
            new Date(b.entradaEm).getTime(),
        );

      setQueue(operationalQueue);

      setMountingQueue(
        (mountingData ?? []).map((row) => ({
          id: text(row.id),
          unidade: text(row.unidade),
          placaCavalo: text(row.placa_cavalo),
          placaCarreta: optionalText(row.placa_carreta),
          motorista: optionalText(row.motorista),
          transportadora: optionalText(row.transportadora),
          cliente: optionalText(row.cliente),
          entradaEm: optionalText(row.entrada_em),
          etapaOperacional:
            text(row.etapa_operacional) as
              | "AGUARDANDO_CONFERENTE"
              | "AGUARDANDO_OPERADOR",
          containerMontagem: optionalText(row.container_montagem),
          instrucaoMontagem: optionalText(row.instrucao_montagem),
          justificativaEntrada: optionalText(
            row.justificativa_entrada,
          ),
        })),
      );

      const occupied: PosicaoBloqueada[] = containerData.flatMap(
        (container): PosicaoBloqueada[] => {
          if (
            !container.quadraId ||
            !container.pilha ||
            !container.fila ||
            !container.altura
          ) {
            return [];
          }

          return [
            {
              containerId: container.id,
              quadraId: container.quadraId,
              pilha: numericSlot(container.pilha),
              fila: numericSlot(container.fila),
              altura: container.altura,
              tipo: "OCUPADA",
            },
          ];
        },
      );

      const reserved: PosicaoBloqueada[] = containerData.flatMap(
        (container): PosicaoBloqueada[] => {
          if (
            !container.quadraReservadaId ||
            !container.pilhaReservada ||
            !container.filaReservada ||
            !container.alturaReservada
          ) {
            return [];
          }

          return [
            {
              containerId: container.id,
              quadraId: container.quadraReservadaId,
              pilha: numericSlot(container.pilhaReservada),
              fila: numericSlot(container.filaReservada),
              altura: container.alturaReservada,
              tipo: "RESERVADA",
            },
          ];
        },
      );

      setBlockedPositions([...occupied, ...reserved]);
      setQuadras(quadraData);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a fila operacional.",
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

  const filteredQueue = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return queue.filter((item) => {
      if (
        unitFilter !== "Todas" &&
        item.unidade !== unitFilter
      ) {
        return false;
      }

      if (
        stageFilter !== "Todos" &&
        stageLabel(item) !== stageFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.numeroContainer,
        item.cliente,
        item.armador,
        item.placaAtual,
        item.unidade,
        item.posicaoReservada,
        item.operacao,
        item.destino,
        item.motorista,
        item.transportadora,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    });
  }, [queue, query, unitFilter, stageFilter]);

  const filteredMountingQueue = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return mountingQueue.filter((item) => {
      if (
        unitFilter !== "Todas" &&
        item.unidade !== unitFilter
      ) {
        return false;
      }

      const label =
        item.etapaOperacional === "AGUARDANDO_CONFERENTE"
          ? "Aguardando conferente"
          : "Aguardando operador";

      if (stageFilter !== "Todos" && label !== stageFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.placaCavalo,
        item.placaCarreta,
        item.motorista,
        item.transportadora,
        item.cliente,
        item.containerMontagem,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedQuery),
      );
    });
  }, [mountingQueue, query, unitFilter, stageFilter]);

  const metrics = useMemo(() => {
    const awaitingConference = queue.filter(
      (item) => getStage(item) === "AGUARDANDO_POSICAO",
    ).length;

    const awaitingOperator = queue.filter(
      (item) => getStage(item) === "AGUARDANDO_EXECUCAO",
    ).length;

    const above30 =
      queue.filter(
        (item) => elapsedMinutes(item.entradaEm) >= 30,
      ).length +
      mountingQueue.filter(
        (item) => elapsedMinutes(item.entradaEm) >= 30,
      ).length;

    const average =
      queue.length + mountingQueue.length > 0
        ? Math.round(
            (
              queue.reduce(
                (sum, item) =>
                  sum + elapsedMinutes(item.entradaEm),
                0,
              ) +
              mountingQueue.reduce(
                (sum, item) =>
                  sum + elapsedMinutes(item.entradaEm),
                0,
              )
            ) /
              (queue.length + mountingQueue.length),
          )
        : 0;

    const mountingAwaitingConference = mountingQueue.filter(
      (item) =>
        item.etapaOperacional === "AGUARDANDO_CONFERENTE",
    ).length;

    const mountingAwaitingOperator = mountingQueue.filter(
      (item) =>
        item.etapaOperacional === "AGUARDANDO_OPERADOR",
    ).length;

    return {
      total: queue.length + mountingQueue.length,
      awaitingConference:
        awaitingConference + mountingAwaitingConference,
      awaitingOperator:
        awaitingOperator + mountingAwaitingOperator,
      above30,
      average,
    };
  }, [queue, mountingQueue]);

  const availableQuadras = useMemo(
    () =>
      quadras.filter(
        (quadra) =>
          quadra.ativo &&
          quadra.permiteArmazenamento &&
          quadra.status !== "Em Manutenção" &&
          quadra.status !== "Bloqueada" &&
          quadra.status !== "Inativa" &&
          (!selectedItem ||
            quadra.unidade === selectedItem.unidade),
      ),
    [quadras, selectedItem],
  );

  const selectedQuadra = useMemo(
    () =>
      quadras.find((quadra) => quadra.id === form.quadraId) ??
      null,
    [quadras, form.quadraId],
  );

  const positionIsBlocked = useMemo(
    () =>
      blockedPositions.some(
        (position) =>
          position.containerId !== selectedItem?.id &&
          position.quadraId === form.quadraId &&
          position.pilha === form.pilha &&
          position.fila === form.fila &&
          position.altura === form.altura,
      ),
    [
      blockedPositions,
      selectedItem?.id,
      form.quadraId,
      form.pilha,
      form.fila,
      form.altura,
    ],
  );

  const openReservation = (item: ItemFila) => {
    const candidates = quadras
      .filter(
        (quadra) =>
          quadra.unidade === item.unidade &&
          quadra.ativo &&
          quadra.permiteArmazenamento &&
          quadra.status !== "Em Manutenção" &&
          quadra.status !== "Bloqueada" &&
          quadra.status !== "Inativa",
      )
      .sort(
        (a, b) =>
          a.percentualOcupacao - b.percentualOcupacao,
      );

    const suggestedQuadra = candidates[0] ?? null;

    const suggestedSlot = suggestedQuadra
      ? findFirstOperationalSlot(
          suggestedQuadra.id,
          blockedPositions.filter(
            (position) =>
              position.containerId !== item.id,
          ),
        )
      : { pilha: 1, fila: 1, altura: 1 };

    setSelectedItem(item);
    setForm({
      quadraId:
        item.quadraReservadaId ??
        suggestedQuadra?.id ??
        "",
      pilha:
        numericSlot(item.pilhaReservada) ||
        suggestedSlot.pilha,
      fila:
        numericSlot(item.filaReservada) ||
        suggestedSlot.fila,
      altura:
        item.alturaReservada ??
        suggestedSlot.altura,
      observacao: item.observacaoReserva ?? "",
    });
    setError("");
    setSuccess("");
  };

  const changeQuadra = (quadraId: string) => {
    const suggestedSlot = findFirstOperationalSlot(
      quadraId,
      blockedPositions.filter(
        (position) =>
          position.containerId !== selectedItem?.id,
      ),
    );

    setForm((current) => ({
      ...current,
      quadraId,
      pilha: suggestedSlot.pilha,
      fila: suggestedSlot.fila,
      altura: suggestedSlot.altura,
    }));
  };

  const confirmReservation = async () => {
    if (!selectedItem || !selectedQuadra) {
      setError("Selecione uma quadra operacional.");
      return;
    }

    if (positionIsBlocked) {
      setError(
        `A posição ${positionLabel(
          form.pilha,
          form.fila,
          form.altura,
        )} já está ocupada ou reservada.`,
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await reserveContainerPosition({
        containerId: selectedItem.id,
        unidade: selectedItem.unidade as Unidade,
        patio: selectedQuadra.patioNome,
        quadraId: selectedQuadra.id,
        quadra: selectedQuadra.nome,
        pilha: String(form.pilha),
        fila: String(form.fila),
        altura: form.altura,
        observacao:
          form.observacao.trim() ||
          `Destino sugerido pelo conferente em ${positionLabel(
            form.pilha,
            form.fila,
            form.altura,
          )}.`,
      });

      setSuccess(
        `${selectedItem.numeroContainer} reservado para ${positionLabel(
          form.pilha,
          form.fila,
          form.altura,
        )}. Aguardando execução do operador.`,
      );

      setSelectedItem(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível reservar a posição.",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelReservation = async (item: ItemFila) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await cancelContainerReservation({
        containerId: item.id,
        motivo: "Ajuste operacional",
        observacao:
          "Reserva removida para nova definição pelo conferente.",
      });

      setSuccess(
        `Reserva de ${item.numeroContainer} cancelada. O contêiner voltou para o conferente.`,
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível cancelar a reserva.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openExecution = (item: ItemFila) => {
    setExecutionItem(item);
    setExecutionObservation("");
    setError("");
    setSuccess("");
  };

  const confirmExecution = async () => {
    if (!executionItem) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await confirmReservedContainerExecution({
        containerId: executionItem.id,
        observacao:
          executionObservation.trim() ||
          `Execução confirmada na posição ${executionItem.posicaoReservada}.`,
      });

      setSuccess(
        `${executionItem.numeroContainer} armazenado em ${executionItem.posicaoReservada}.`,
      );

      setExecutionItem(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível confirmar a execução.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openMountingConference = (item: TarefaMontagem) => {
    setSelectedMountingTask(item);
    setMountingContainer(item.containerMontagem ?? "");
    setMountingInstruction(item.instrucaoMontagem ?? "");
    setError("");
  };

  const saveMountingConference = async () => {
    if (!selectedMountingTask) return;

    if (
      !mountingContainer.trim() &&
      !mountingInstruction.trim()
    ) {
      setError(
        "Informe o contêiner ou uma instrução clara para o operador.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const { error: updateError } = await supabase
        .from("movimentacoes")
        .update({
          container_montagem:
            mountingContainer.trim().toUpperCase() || null,
          instrucao_montagem:
            mountingInstruction.trim() || null,
          etapa_operacional: "AGUARDANDO_OPERADOR",
          conferido_em: new Date().toISOString(),
          conferido_por: session.user.id,
        })
        .eq("id", selectedMountingTask.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess(
        `${selectedMountingTask.placaCavalo} enviada ao operador para montagem.`,
      );
      setSelectedMountingTask(null);
      setMountingContainer("");
      setMountingInstruction("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível encaminhar a montagem.",
      );
    } finally {
      setSaving(false);
    }
  };

  const finishMounting = async () => {
    if (!completingMountingTask) return;

    const numeroContainer =
      completingMountingTask.containerMontagem
        ?.trim()
        .toUpperCase();

    if (!numeroContainer) {
      setError(
        "O conferente precisa informar o número do contêiner antes da confirmação da montagem.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      /*
       * Confirmação idempotente:
       * - se o contêiner ainda não existe, cria normalmente;
       * - se já foi criado por esta mesma montagem em uma tentativa anterior,
       *   reutiliza o registro e conclui o fluxo;
       * - se pertence a outra movimentação ativa, bloqueia para evitar duplicidade.
       */
      const existingContainer =
        await getContainerByNumber(numeroContainer);

      const normalizedPlate =
        completingMountingTask.placaCavalo
          .trim()
          .toUpperCase();

      const belongsToThisMounting =
        existingContainer &&
        (
          existingContainer.movimentoEntradaId ===
            completingMountingTask.id ||
          existingContainer.movimentoAtualId ===
            completingMountingTask.id ||
          existingContainer.placaEntrada === normalizedPlate ||
          existingContainer.placaAtual === normalizedPlate
        );

      if (existingContainer && !belongsToThisMounting) {
const location = [
  existingContainer.unidade,
  existingContainer.patio,
  existingContainer.pilha,
  existingContainer.fila,
  existingContainer.altura
    ? `Altura ${existingContainer.altura}`
    : null,
  existingContainer.posicao,
]
  .filter(Boolean)
  .join(" • ");

        throw new Error(
          `O contêiner ${numeroContainer} já está ativo no terminal` +
            `${location ? ` em ${location}` : ""}` +
            `. Status atual: ${existingContainer.status}. Verifique o número informado ou utilize o registro existente.`,
        );
      }

      if (!existingContainer) {
        await createContainerFromMovement({
          numeroContainer,
          unidade: completingMountingTask.unidade as Unidade,
          cliente:
            completingMountingTask.cliente &&
            completingMountingTask.cliente !== "Acesso geral"
              ? completingMountingTask.cliente
              : undefined,
          movimentoEntradaId: completingMountingTask.id,
          placaEntrada: completingMountingTask.placaCavalo,
          observacoes:
            completingMountingTask.instrucaoMontagem ||
            "Contêiner montado no terminal.",
        });
      }

      const { error: updateError } = await supabase
        .from("movimentacoes")
        .update({
          numero_container: numeroContainer,
          etapa_operacional: "CONCLUIDA",
          exige_fila_operacional: false,
          status: "Em Operação",
          operacao: "Montagem de Contêiner Concluída",
          operacao_concluida_em: new Date().toISOString(),
          operacao_concluida_por: session.user.id,
        })
        .eq("id", completingMountingTask.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess(
        existingContainer
          ? `${numeroContainer} já estava vinculado a esta montagem. O fluxo foi retomado e encaminhado à fila normal do conferente.`
          : `${numeroContainer} montado no veículo ${completingMountingTask.placaCavalo} e encaminhado à fila normal do conferente.`,
      );

      setCompletingMountingTask(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a montagem.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.15),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_26%),#020617] text-slate-100">
      <Sidebar />

      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[30px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-400">
              Fluxo integrado
            </p>

            <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">
                  Fila Operacional
                </h1>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                  O AGP registra a entrada. O conferente sugere o
                  destino. O operador confirma ou devolve para
                  ajuste. O mapa só recebe o contêiner após a
                  execução física.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200">
                Atualização em tempo real
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
            {[
              ["Total na fila", metrics.total],
              ["Aguardando conferente", metrics.awaitingConference],
              ["Aguardando operador", metrics.awaitingOperator],
              ["Acima de 30 min", metrics.above30],
              ["Tempo médio", `${metrics.average} min`],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-3xl border border-white/10 bg-slate-900/65 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </p>

                <p className="mt-3 text-3xl font-black">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900/55 p-4 backdrop-blur sm:p-6">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_250px]">
              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Buscar contêiner, cliente, armador, placa ou posição"
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              />

              <select
                value={unitFilter}
                onChange={(event) =>
                  setUnitFilter(event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              >
                <option>Todas</option>
                <option>JAV 1</option>
                <option>JAV 2</option>
              </select>

              <select
                value={stageFilter}
                onChange={(event) =>
                  setStageFilter(event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              >
                <option>Todos</option>
                <option>Aguardando conferente</option>
                <option>Aguardando operador</option>
              </select>
            </div>

            {error && !selectedItem && !executionItem ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                {success}
              </div>
            ) : null}

            <div className="mt-6">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-10 text-center text-slate-400">
                  Carregando fila operacional...
                </div>
              ) : null}

              {!loading && filteredQueue.length === 0 && filteredMountingQueue.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-10 text-center">
                  <p className="text-xl font-black text-emerald-200">
                    Fila zerada
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Nenhum contêiner ou veículo de montagem aguarda conferência ou execução.
                  </p>
                </div>
              ) : null}

              {!loading && filteredMountingQueue.length > 0 ? (
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                        Caminhões sem contêiner
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        Montagens de Contêineres
                      </h2>
                    </div>

                    <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">
                      {filteredMountingQueue.length}
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {filteredMountingQueue.map((item) => {
                      const minutes = elapsedMinutes(item.entradaEm);
                      const awaitingConference =
                        item.etapaOperacional ===
                        "AGUARDANDO_CONFERENTE";

                      return (
                        <article
                          key={`montagem-${item.id}`}
                          className="rounded-[26px] border border-amber-400/20 bg-amber-500/5 p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
                                Montagem de contêiner
                              </p>

                              <h2 className="mt-1 text-2xl font-black">
                                {item.placaCavalo}
                              </h2>

                              <p className="mt-1 text-sm text-slate-400">
                                {item.motorista || "Sem motorista"} •{" "}
                                {item.transportadora || "Sem empresa"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full border px-3 py-2 text-xs font-black ${
                                  awaitingConference
                                    ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                                    : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                                }`}
                              >
                                {awaitingConference
                                  ? "Aguardando conferente"
                                  : "Aguardando operador"}
                              </span>

                              <span
                                className={`rounded-full border px-3 py-2 text-xs font-black ${priorityClass(
                                  minutes,
                                )}`}
                              >
                                {minutes} min
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                              <p className="text-xs text-slate-500">
                                Unidade
                              </p>
                              <p className="mt-1 font-bold">
                                {item.unidade}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                              <p className="text-xs text-slate-500">
                                Entrada
                              </p>
                              <p className="mt-1 font-bold">
                                {formatDate(item.entradaEm)}
                              </p>
                            </div>
                          </div>

                          {!awaitingConference ? (
                            <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                                Instrução do conferente
                              </p>
                              <p className="mt-2 text-lg font-black text-cyan-100">
                                {item.containerMontagem ||
                                  "Contêiner a definir na operação"}
                              </p>
                              {item.instrucaoMontagem ? (
                                <p className="mt-2 text-sm text-slate-300">
                                  {item.instrucaoMontagem}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {awaitingConference ? (
                            <button
                              type="button"
                              onClick={() =>
                                openMountingConference(item)
                              }
                              className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400"
                            >
                              Definir Contêiner
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setCompletingMountingTask(item)
                              }
                              className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
                            >
                              Confirmar montagem
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!loading && filteredQueue.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredQueue.map((item) => {
                    const minutes = elapsedMinutes(item.entradaEm);
                    const stage = getStage(item);

                    return (
                      <article
                        key={item.id}
                        className="rounded-[26px] border border-white/10 bg-slate-950/65 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                              Contêiner
                            </p>

                            <h2 className="mt-1 text-2xl font-black">
                              {item.numeroContainer}
                            </h2>

                            <p className="mt-1 text-sm text-slate-400">
                              {item.cliente || "Sem cliente"} •{" "}
                              {item.armador || "Sem armador"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.operacao || "Operação não informada"}
                              {item.destino ? ` • ${item.destino}` : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-2 text-xs font-black ${stageClass(
                                item,
                              )}`}
                            >
                              {stageLabel(item)}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-2 text-xs font-black ${priorityClass(
                                minutes,
                              )}`}
                            >
                              {minutes} min
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {[
                            ["Unidade", item.unidade],
                            ["Status", item.status],
                            ["Condição", item.condicao || "-"],
                            ["Placa", item.placaAtual || item.placaEntrada || "-"],
                          ].map(([label, value]) => (
                            <div
                              key={String(label)}
                              className="rounded-2xl border border-white/5 bg-slate-900/70 p-3"
                            >
                              <p className="text-xs text-slate-500">
                                {label}
                              </p>

                              <p className="mt-1 truncate font-bold">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {stage === "AGUARDANDO_EXECUCAO" ? (
                          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                              Destino sugerido pelo conferente
                            </p>

                            <p className="mt-2 text-2xl font-black text-amber-100">
                              {item.posicaoReservada}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {item.unidade} •{" "}
                              {item.patioReservado || "-"} •{" "}
                              {item.quadraReservada || "-"}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              Reservado em{" "}
                              {formatDate(item.reservadoEm)}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                            <p className="text-xs text-slate-500">
                              Entrada registrada pelo gate
                            </p>

                            <p className="mt-1 font-bold">
                              {formatDate(item.entradaEm)}
                            </p>
                          </div>
                        )}

                        {stage === "AGUARDANDO_POSICAO" ? (
                          <button
                            type="button"
                            onClick={() => openReservation(item)}
                            className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400"
                          >
                            Sugerir destino
                          </button>
                        ) : (
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => openExecution(item)}
                              className="rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
                            >
                              Confirmar execução
                            </button>

                            <button
                              type="button"
                              onClick={() => openReservation(item)}
                              className="rounded-2xl bg-violet-500 px-4 py-3 font-black text-white transition hover:bg-violet-400"
                            >
                              Alterar destino
                            </button>

                            <button
                              type="button"
                              onClick={() => cancelReservation(item)}
                              disabled={saving}
                              className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 font-black text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-50"
                            >
                              Devolver ao conferente
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {selectedMountingTask ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="w-full max-w-xl rounded-[28px] border border-cyan-400/25 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              Definição do contêiner pelo conferente
            </p>

            <h3 className="mt-2 text-2xl font-black">
              {selectedMountingTask.placaCavalo}
            </h3>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold text-slate-400">
                Contêiner para montagem
              </span>
              <input
                value={mountingContainer}
                onChange={(event) =>
                  setMountingContainer(
                    event.target.value.toUpperCase(),
                  )
                }
                placeholder="Informe o contêiner ou deixe a instrução operacional"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 uppercase outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold text-slate-400">
                Instrução ao operador
              </span>
              <textarea
                value={mountingInstruction}
                onChange={(event) =>
                  setMountingInstruction(event.target.value)
                }
                rows={3}
                placeholder="Ex.: montar SOC vazio da pilha 03 ou aguardar indicação por rádio"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMountingTask(null)}
                disabled={saving}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveMountingConference}
                disabled={saving}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Liberar para o operador"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {completingMountingTask ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-400/25 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
              Confirmação do operador
            </p>

            <h3 className="mt-2 text-2xl font-black">
              Confirmar montagem?
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Veículo {completingMountingTask.placaCavalo}
              {completingMountingTask.containerMontagem
                ? ` com o contêiner ${completingMountingTask.containerMontagem}`
                : ""}.
              O caminhão sairá da fila de montagem. O contêiner
              será criado automaticamente e entrará na fila normal,
              aguardando definição do conferente.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCompletingMountingTask(null)}
                disabled={saving}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={finishMounting}
                disabled={saving}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {saving ? "Confirmando..." : "Confirmar montagem"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
                  Planejamento pelo conferente
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {selectedItem.numeroContainer}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  O destino é sugerido, não definitivo. O operador
                  ainda poderá solicitar alteração antes da
                  execução.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setError("");
                }}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                Reserva não bloqueante para a operação
              </p>

              <p className="mt-2 text-sm text-cyan-50">
                A posição fica protegida contra dupla indicação,
                mas pode ser alterada pelo conferente antes da
                confirmação física.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Quadra
                </span>

                <select
                  value={form.quadraId}
                  onChange={(event) =>
                    changeQuadra(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                >
                  <option value="">
                    Selecione uma quadra
                  </option>

                  {availableQuadras.map((quadra) => (
                    <option key={quadra.id} value={quadra.id}>
                      {quadra.unidade} • {quadra.patioNome} •{" "}
                      {quadra.nome} •{" "}
                      {quadra.percentualOcupacao.toFixed(1)}%
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Pilha
                </span>

                <input
                  type="number"
                  min={1}
                  max={PILHAS_PADRAO}
                  value={form.pilha}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pilha: Math.max(
                        1,
                        Number(event.target.value) || 1,
                      ),
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Fila
                </span>

                <input
                  type="number"
                  min={1}
                  max={FILAS_PADRAO}
                  value={form.fila}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fila: Math.max(
                        1,
                        Number(event.target.value) || 1,
                      ),
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Altura
                </span>

                <select
                  value={form.altura}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      altura: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((height) => (
                    <option key={height} value={height}>
                      H{String(height).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Endereço sugerido
                </p>

                <p
                  className={`mt-2 text-xl font-black ${
                    positionIsBlocked
                      ? "text-rose-300"
                      : "text-emerald-300"
                  }`}
                >
                  {positionLabel(
                    form.pilha,
                    form.fila,
                    form.altura,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {positionIsBlocked
                    ? "Posição ocupada ou reservada"
                    : "Posição disponível"}
                </p>
              </div>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Instrução ao operador
                </span>

                <textarea
                  value={form.observacao}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      observacao: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Ex.: priorizar lado direito da pilha; carga sensível à umidade."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setError("");
                }}
                disabled={saving}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmReservation}
                disabled={
                  saving ||
                  !selectedQuadra ||
                  positionIsBlocked
                }
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Reservando..."
                  : "Reservar destino"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {executionItem ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="w-full max-w-xl rounded-[30px] border border-cyan-400/20 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                  Confirmação do operador
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {executionItem.numeroContainer}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExecutionItem(null);
                  setError("");
                }}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                Destino sugerido
              </p>

              <p className="mt-2 text-3xl font-black text-amber-100">
                {executionItem.posicaoReservada}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {executionItem.unidade} •{" "}
                {executionItem.patioReservado || "-"} •{" "}
                {executionItem.quadraReservada || "-"}
              </p>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold text-slate-400">
                Observação da execução
              </span>

              <textarea
                value={executionObservation}
                onChange={(event) =>
                  setExecutionObservation(event.target.value)
                }
                rows={3}
                placeholder="Opcional. Registre particularidades da operação."
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
              />
            </label>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setExecutionItem(null);
                  openReservation(executionItem);
                }}
                disabled={saving}
                className="rounded-2xl bg-violet-500 px-4 py-3 font-black text-white transition hover:bg-violet-400 disabled:opacity-50"
              >
                Alterar posição
              </button>

              <button
                type="button"
                onClick={confirmExecution}
                disabled={saving}
                className="rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving
                  ? "Confirmando..."
                  : "Confirmar armazenamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
