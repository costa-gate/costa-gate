"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  getContainerTimeline,
  moveContainerToStack,
} from "@/lib/containers";
import type {
  EventoContainer,
  MotivoMovimentacaoContainer,
  Unidade,
} from "@/types";
import {
  atualizarQuadra,
  buscarContainersAtivos,
  listarContainersPorQuadra,
  listarPatios,
  listarQuadras,
  subscribeToPatios,
  type ContainerDaQuadra,
  type PatioTerminal,
  type QuadraTerminal,
  type StatusQuadra,
} from "@/lib/patios";

type ViewMode = "cards" | "mapa";
type Slot = {
  pilha: number;
  fila: number;
  altura: number;
  container: ContainerDaQuadra | null;
};

type ReservaDaQuadra = {
  id: string;
  numeroContainer: string;
  unidade: string;
  cliente?: string | null;
  armador?: string | null;
  condicao?: string | null;
  status: string;
  placaAtual?: string | null;
  entradaEm?: string | null;
  quadraReservadaId: string;
  patioReservado?: string | null;
  quadraReservada?: string | null;
  pilhaReservada: string;
  filaReservada: string;
  alturaReservada: number;
  posicaoReservada: string;
  reservadoEm?: string | null;
  observacaoReserva?: string | null;
};

type DatabaseRow = Record<string, unknown>;

const statusClasses: Record<StatusQuadra, string> = {
  Operando: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  "Operação Restrita":
    "border-amber-400/30 bg-amber-500/10 text-amber-200",
  "Em Manutenção":
    "border-orange-400/30 bg-orange-500/10 text-orange-200",
  Bloqueada: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  Inativa: "border-slate-400/30 bg-slate-500/10 text-slate-300",
};

const progressClass = (quadra: QuadraTerminal) => {
  if (
    quadra.status === "Em Manutenção" ||
    quadra.status === "Bloqueada" ||
    quadra.status === "Inativa"
  ) {
    return "bg-rose-500";
  }

  if (quadra.status === "Operação Restrita") return "bg-amber-400";
  if (quadra.percentualOcupacao >= 95) return "bg-rose-500";
  if (quadra.percentualOcupacao >= 85) return "bg-orange-500";
  if (quadra.percentualOcupacao >= 70) return "bg-amber-400";
  return "bg-emerald-500";
};

const borderClass = (quadra: QuadraTerminal) => {
  if (
    quadra.status === "Em Manutenção" ||
    quadra.status === "Bloqueada" ||
    quadra.status === "Inativa"
  ) {
    return "border-rose-400/30";
  }

  if (quadra.status === "Operação Restrita") return "border-amber-400/30";
  if (quadra.percentualOcupacao >= 95) return "border-rose-400/30";
  if (quadra.percentualOcupacao >= 85) return "border-orange-400/30";
  if (quadra.percentualOcupacao >= 70) return "border-amber-400/30";
  return "border-emerald-400/20";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR");
};

const permanencia = (value?: string | null) => {
  if (!value) return 0;

  const start = new Date(value).getTime();

  if (Number.isNaN(start)) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - start) / 86_400_000),
  );
};

const numberFromPositionPart = (value?: string | null) => {
  if (!value) return 0;

  const parsed = Number(String(value).replace(/\D/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
};

const getSlotKey = (
  pilha: number,
  fila: number,
  altura: number,
) => `${pilha}-${fila}-${altura}`;

const getContainerShortName = (numero: string) => {
  const normalized = numero.trim().toUpperCase();

  if (normalized.length <= 8) return normalized;

  return `${normalized.slice(0, 4)}…${normalized.slice(-3)}`;
};

const normalizeOptionalText = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? null
    : String(value);

const normalizeReserva = (row: DatabaseRow): ReservaDaQuadra => ({
  id: String(row.id ?? ""),
  numeroContainer: String(row.numero_container ?? ""),
  unidade: String(row.unidade ?? ""),
  cliente: normalizeOptionalText(row.cliente),
  armador: normalizeOptionalText(row.armador),
  condicao: normalizeOptionalText(row.condicao),
  status: String(row.status ?? ""),
  placaAtual: normalizeOptionalText(row.placa_atual),
  entradaEm: normalizeOptionalText(row.entrada_em),
  quadraReservadaId: String(row.quadra_reservada_id ?? ""),
  patioReservado: normalizeOptionalText(row.patio_reservado),
  quadraReservada: normalizeOptionalText(row.quadra_reservada),
  pilhaReservada: String(row.pilha_reservada ?? ""),
  filaReservada: String(row.fila_reservada ?? ""),
  alturaReservada: Number(row.altura_reservada ?? 0),
  posicaoReservada: String(row.posicao_reservada ?? ""),
  reservadoEm: normalizeOptionalText(row.reservado_em),
  observacaoReserva: normalizeOptionalText(row.observacao_reserva),
});

const minutosDesde = (value?: string | null) => {
  if (!value) return 0;

  const start = new Date(value).getTime();

  if (Number.isNaN(start)) return 0;

  return Math.max(0, Math.floor((Date.now() - start) / 60_000));
};


const toDatetimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
};

const fromDatetimeLocal = (value: string) =>
  value ? new Date(value).toISOString() : null;

type EditQuadraForm = {
  capacidadeOperacional: string;
  status: StatusQuadra;
  permiteArmazenamento: boolean;
  motivoRestricao: string;
  inicioRestricao: string;
  previsaoLiberacao: string;
  observacoes: string;
};

const buildEditQuadraForm = (
  quadra: QuadraTerminal,
): EditQuadraForm => ({
  capacidadeOperacional: String(quadra.capacidadeOperacional),
  status: quadra.status,
  permiteArmazenamento: quadra.permiteArmazenamento,
  motivoRestricao: quadra.motivoRestricao ?? "",
  inicioRestricao: toDatetimeLocal(quadra.inicioRestricao),
  previsaoLiberacao: toDatetimeLocal(quadra.previsaoLiberacao),
  observacoes: quadra.observacoes ?? "",
});

export default function GestaoPatioPage() {
  const [patios, setPatios] = useState<PatioTerminal[]>([]);
  const [quadras, setQuadras] = useState<QuadraTerminal[]>([]);

  const [selectedQuadra, setSelectedQuadra] =
    useState<QuadraTerminal | null>(null);

  const [editingQuadra, setEditingQuadra] =
    useState<QuadraTerminal | null>(null);
  const [quadraForm, setQuadraForm] =
    useState<EditQuadraForm | null>(null);
  const [savingQuadra, setSavingQuadra] = useState(false);
  const [quadraEditError, setQuadraEditError] = useState("");

  const [containers, setContainers] = useState<ContainerDaQuadra[]>([]);
  const [reservas, setReservas] = useState<ReservaDaQuadra[]>([]);
  const [selectedReserva, setSelectedReserva] =
    useState<ReservaDaQuadra | null>(null);
  const [selectedContainer, setSelectedContainer] =
    useState<ContainerDaQuadra | null>(null);

  const [movingContainer, setMovingContainer] =
    useState<ContainerDaQuadra | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [moveObservation, setMoveObservation] = useState("");
  const [savingMove, setSavingMove] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [moveSuccess, setMoveSuccess] = useState("");

  const [historyContainer, setHistoryContainer] =
    useState<ContainerDaQuadra | null>(null);
  const [timeline, setTimeline] = useState<EventoContainer[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState("");

  const [containerSearch, setContainerSearch] = useState("");
  const [containerSearchResults, setContainerSearchResults] = useState<
    ContainerDaQuadra[]
  >([]);
  const [searchingContainer, setSearchingContainer] = useState(false);
  const [containerSearchError, setContainerSearchError] = useState("");

  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [viewMode, setViewMode] = useState<ViewMode>("mapa");

  const [maxPilhas, setMaxPilhas] = useState(6);
  const [maxFilas, setMaxFilas] = useState(8);
  const [maxAlturas, setMaxAlturas] = useState(6);

  const [selectedPilha, setSelectedPilha] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [patioData, quadraData] = await Promise.all([
        listarPatios(),
        listarQuadras(),
      ]);

      setPatios(patioData);
      setQuadras(quadraData);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o mapa do pátio.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToPatios(loadData);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedQuadra) return;

    const refreshSelectedQuadra = async () => {
      try {
        const [containerData, reservationData] = await Promise.all([
          listarContainersPorQuadra(selectedQuadra.id),
          listarReservasPorQuadra(selectedQuadra.id),
        ]);

        setContainers(containerData);
        setReservas(reservationData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível atualizar a quadra em tempo real.",
        );
      }
    };

    const channel = supabase.channel(
      `gestao-patio-reservas-${selectedQuadra.id}`,
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "containers_terminal",
      },
      refreshSelectedQuadra,
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedQuadra?.id]);

  const totals = useMemo(() => {
    const capacidadeOriginal = quadras.reduce(
      (sum, item) => sum + item.capacidadeOriginal,
      0,
    );

    const capacidadeOperacional = quadras.reduce(
      (sum, item) => sum + item.capacidadeOperacional,
      0,
    );

    const ocupacao = quadras.reduce(
      (sum, item) => sum + item.ocupacao,
      0,
    );

    const livres = Math.max(
      0,
      capacidadeOperacional - ocupacao,
    );

    const percentual =
      capacidadeOperacional > 0
        ? (ocupacao / capacidadeOperacional) * 100
        : 0;

    return {
      capacidadeOriginal,
      capacidadeOperacional,
      ocupacao,
      livres,
      percentual,
      criticas: quadras.filter(
        (item) =>
          item.percentualOcupacao >= 90 ||
          !item.permiteArmazenamento,
      ).length,
    };
  }, [quadras]);

  const filteredQuadras = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return quadras.filter((quadra) => {
      if (
        unitFilter !== "Todas" &&
        quadra.unidade !== unitFilter
      ) {
        return false;
      }

      if (
        statusFilter !== "Todos" &&
        quadra.status !== statusFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        quadra.nome,
        quadra.codigo,
        quadra.patioNome,
        quadra.unidade,
        quadra.status,
      ].some((value) =>
        String(value)
          .toLowerCase()
          .includes(normalizedQuery),
      );
    });
  }, [quadras, query, unitFilter, statusFilter]);

  const patiosComQuadras = useMemo(
    () =>
      patios
        .map((patio) => ({
          patio,
          quadras: filteredQuadras.filter(
            (quadra) => quadra.patioId === patio.id,
          ),
        }))
        .filter((item) => item.quadras.length > 0),
    [patios, filteredQuadras],
  );

  const listarReservasPorQuadra = async (
    quadraId: string,
  ): Promise<ReservaDaQuadra[]> => {
    const { data, error: reservationError } = await supabase
      .from("containers_terminal")
      .select(`
        id,
        numero_container,
        unidade,
        cliente,
        armador,
        condicao,
        status,
        placa_atual,
        entrada_em,
        quadra_reservada_id,
        patio_reservado,
        quadra_reservada,
        pilha_reservada,
        fila_reservada,
        altura_reservada,
        posicao_reservada,
        reservado_em,
        observacao_reserva
      `)
      .eq("quadra_reservada_id", quadraId)
      .neq("status", "Saiu")
      .is("quadra_id", null)
      .not("posicao_reservada", "is", null)
      .order("reservado_em", { ascending: true });

    if (reservationError) {
      throw new Error(reservationError.message);
    }

    return (data ?? []).map((row) =>
      normalizeReserva(row as DatabaseRow),
    );
  };

  const openQuadra = async (quadra: QuadraTerminal) => {
    try {
      setSelectedQuadra(quadra);
      setLoadingContainers(true);
      setContainers([]);
      setReservas([]);
      setSelectedReserva(null);
      setSelectedContainer(null);
      setMovingContainer(null);
      setTargetSlot(null);
      setMoveObservation("");
      setMoveError("");
      setMoveSuccess("");
      setHistoryContainer(null);
      setTimeline([]);
      setTimelineError("");
      setViewMode("mapa");
      setError("");

      const [data, reservationData] = await Promise.all([
        listarContainersPorQuadra(quadra.id),
        listarReservasPorQuadra(quadra.id),
      ]);

      setContainers(data);
      setReservas(reservationData);

      const greatestPilha = Math.max(
        1,
        ...data.map((item) =>
          numberFromPositionPart(item.pilha),
        ),
      );

      const greatestFila = Math.max(
        1,
        ...data.map((item) =>
          numberFromPositionPart(item.fila),
        ),
      );

      const greatestAltura = Math.max(
        1,
        ...data.map((item) => Number(item.altura ?? 0)),
      );

      setMaxPilhas(Math.max(6, greatestPilha));
      setMaxFilas(Math.max(8, greatestFila));
      setMaxAlturas(Math.max(6, greatestAltura));
      setSelectedPilha(
        greatestPilha > 0 ? greatestPilha : 1,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os contêineres da quadra.",
      );
    } finally {
      setLoadingContainers(false);
    }
  };

  const searchContainer = async () => {
    try {
      setSearchingContainer(true);
      setContainerSearchError("");
      setContainerSearchResults([]);

      const results = await buscarContainersAtivos(containerSearch);

      if (results.length === 0) {
        setContainerSearchError(
          "Nenhum contêiner ativo foi encontrado no pátio.",
        );
        return;
      }

      setContainerSearchResults(results);
    } catch (err) {
      setContainerSearchError(
        err instanceof Error
          ? err.message
          : "Não foi possível localizar o contêiner.",
      );
    } finally {
      setSearchingContainer(false);
    }
  };

  const focusContainerOnMap = async (
    container: ContainerDaQuadra,
  ) => {
    const quadra = quadras.find(
      (item) => item.id === container.quadraId,
    );

    if (!quadra) {
      setContainerSearchError(
        "A quadra vinculada ao contêiner não foi encontrada.",
      );
      return;
    }

    await openQuadra(quadra);

    const pilha = numberFromPositionPart(container.pilha);

    if (pilha > 0) {
      setSelectedPilha(pilha);
    }

    setSelectedContainer(container);
    setContainerSearchResults([]);
    setContainerSearchError("");
  };

  const containerBySlot = useMemo(() => {
    const map = new Map<string, ContainerDaQuadra>();

    for (const container of containers) {
      const pilha = numberFromPositionPart(container.pilha);
      const fila = numberFromPositionPart(container.fila);
      const altura = Number(container.altura ?? 0);

      if (!pilha || !fila || !altura) continue;

      map.set(
        getSlotKey(pilha, fila, altura),
        container,
      );
    }

    return map;
  }, [containers]);

  const reservaBySlot = useMemo(() => {
    const map = new Map<string, ReservaDaQuadra>();

    for (const reserva of reservas) {
      const pilha = numberFromPositionPart(
        reserva.pilhaReservada,
      );
      const fila = numberFromPositionPart(
        reserva.filaReservada,
      );
      const altura = Number(reserva.alturaReservada ?? 0);

      if (!pilha || !fila || !altura) continue;

      map.set(getSlotKey(pilha, fila, altura), reserva);
    }

    return map;
  }, [reservas]);

  const slotsDaPilha = useMemo<Slot[]>(() => {
    const slots: Slot[] = [];

    for (let altura = maxAlturas; altura >= 1; altura -= 1) {
      for (let fila = 1; fila <= maxFilas; fila += 1) {
        slots.push({
          pilha: selectedPilha,
          fila,
          altura,
          container:
            containerBySlot.get(
              getSlotKey(
                selectedPilha,
                fila,
                altura,
              ),
            ) ?? null,
        });
      }
    }

    return slots;
  }, [
    containerBySlot,
    maxAlturas,
    maxFilas,
    selectedPilha,
  ]);

  const openHistory = async (container: ContainerDaQuadra) => {
    try {
      setSelectedContainer(null);
      setHistoryContainer(container);
      setTimeline([]);
      setTimelineError("");
      setLoadingTimeline(true);

      const data = await getContainerTimeline(container.id);
      setTimeline(data);
    } catch (err) {
      setTimelineError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar o histórico do contêiner.",
      );
    } finally {
      setLoadingTimeline(false);
    }
  };

  const startMove = (container: ContainerDaQuadra) => {
    setMovingContainer(container);
    setSelectedContainer(null);
    setTargetSlot(null);
    setMoveObservation("");
    setMoveError("");
    setMoveSuccess("");
    setViewMode("mapa");

    const currentPilha = numberFromPositionPart(container.pilha);

    if (currentPilha > 0) {
      setSelectedPilha(currentPilha);
    }
  };

  const cancelMove = () => {
    setMovingContainer(null);
    setTargetSlot(null);
    setMoveObservation("");
    setMoveError("");
  };

  const confirmMove = async () => {
    if (!movingContainer || !targetSlot || !selectedQuadra) return;

    try {
      setSavingMove(true);
      setMoveError("");
      setMoveSuccess("");

      await moveContainerToStack({
        containerId: movingContainer.id,
        unidade: selectedQuadra.unidade as Unidade,
        patio: selectedQuadra.patioNome,
        quadraId: selectedQuadra.id,
        quadra: selectedQuadra.nome,
        pilha: String(targetSlot.pilha),
        fila: String(targetSlot.fila),
        altura: targetSlot.altura,
        motivo: "Reposicionamento" as MotivoMovimentacaoContainer,
        observacao:
          moveObservation.trim() ||
          `Movimentação gráfica para P${String(targetSlot.pilha).padStart(
            2,
            "0",
          )}-F${String(targetSlot.fila).padStart(2, "0")}-H${String(
            targetSlot.altura,
          ).padStart(2, "0")}`,
        movimentoId: null,
      });

      const updatedContainers = await listarContainersPorQuadra(
        selectedQuadra.id,
      );

      const updatedQuadras = await listarQuadras();

      setContainers(updatedContainers);
      setQuadras(updatedQuadras);
      setMoveSuccess(
        `${movingContainer.numeroContainer} movimentado com sucesso.`,
      );
      setMovingContainer(null);
      setTargetSlot(null);
      setMoveObservation("");
    } catch (err) {
      setMoveError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a movimentação.",
      );
    } finally {
      setSavingMove(false);
    }
  };

  const occupiedInSelectedPilha = useMemo(
    () =>
      containers.filter(
        (container) =>
          numberFromPositionPart(container.pilha) ===
          selectedPilha,
      ).length,
    [containers, selectedPilha],
  );

  const reservedInSelectedPilha = useMemo(
    () =>
      reservas.filter(
        (reserva) =>
          numberFromPositionPart(
            reserva.pilhaReservada,
          ) === selectedPilha,
      ).length,
    [reservas, selectedPilha],
  );


  const openQuadraStatus = (quadra: QuadraTerminal) => {
    setEditingQuadra(quadra);
    setQuadraForm(buildEditQuadraForm(quadra));
    setQuadraEditError("");
  };

  const closeQuadraStatus = () => {
    if (savingQuadra) return;
    setEditingQuadra(null);
    setQuadraForm(null);
    setQuadraEditError("");
  };

  const updateQuadraForm = <K extends keyof EditQuadraForm>(
    field: K,
    value: EditQuadraForm[K],
  ) => {
    setQuadraForm((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const handleQuadraStatusChange = (status: StatusQuadra) => {
    if (!editingQuadra || !quadraForm) return;

    const unavailable =
      status === "Em Manutenção" ||
      status === "Bloqueada" ||
      status === "Inativa";

    setQuadraForm({
      ...quadraForm,
      status,
      permiteArmazenamento: unavailable
        ? false
        : status === "Operando"
          ? true
          : quadraForm.permiteArmazenamento,
      capacidadeOperacional: unavailable
        ? "0"
        : status === "Operando"
          ? editingQuadra.capacidadeOriginal > 0
            ? String(editingQuadra.capacidadeOriginal)
            : editingQuadra.capacidadeOperacional > 0
              ? String(editingQuadra.capacidadeOperacional)
              : ""
          : quadraForm.capacidadeOperacional,
      motivoRestricao:
        status === "Operando" ? "" : quadraForm.motivoRestricao,
      inicioRestricao:
        status === "Operando"
          ? ""
          : quadraForm.inicioRestricao ||
            toDatetimeLocal(new Date().toISOString()),
      previsaoLiberacao:
        status === "Operando" ? "" : quadraForm.previsaoLiberacao,
    });
  };

  const saveQuadraStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingQuadra || !quadraForm) return;

    try {
      setSavingQuadra(true);
      setQuadraEditError("");

      const capacidadeOperacional = Number(
        quadraForm.capacidadeOperacional,
      );

      if (!Number.isFinite(capacidadeOperacional)) {
        throw new Error("Informe uma capacidade operacional válida.");
      }

      if (
        quadraForm.status === "Operando" &&
        capacidadeOperacional <= 0
      ) {
        throw new Error(
          "A capacidade original desta quadra está zerada. Informe manualmente a capacidade correta antes de liberar.",
        );
      }

      if (
        quadraForm.status !== "Operando" &&
        !quadraForm.motivoRestricao.trim()
      ) {
        throw new Error(
          "Informe o motivo da restrição, manutenção ou bloqueio.",
        );
      }

      await atualizarQuadra({
        quadraId: editingQuadra.id,
        capacidadeOperacional,
        status: quadraForm.status,
        permiteArmazenamento:
          quadraForm.permiteArmazenamento,
        motivoRestricao:
          quadraForm.motivoRestricao.trim() || null,
        inicioRestricao: fromDatetimeLocal(
          quadraForm.inicioRestricao,
        ),
        previsaoLiberacao: fromDatetimeLocal(
          quadraForm.previsaoLiberacao,
        ),
        observacoes:
          quadraForm.observacoes.trim() || null,
      });

      const updatedQuadras = await listarQuadras();
      setQuadras(updatedQuadras);

      const updatedSelected = updatedQuadras.find(
        (item) => item.id === editingQuadra.id,
      );

      if (updatedSelected) {
        setSelectedQuadra(updatedSelected);
      }

      setEditingQuadra(null);
      setQuadraForm(null);
    } catch (err) {
      setQuadraEditError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a quadra.",
      );
    } finally {
      setSavingQuadra(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_26%),#020617] text-slate-100">
      <Sidebar />

      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[30px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-400">
              Mapa operacional
            </p>

            <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">
                  Gestão do Pátio
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Visualização por unidade, pátio, quadra,
                  pilha, fila e altura.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
                Atualização em tempo real
              </div>
            </div>

            <div className="relative mt-6 rounded-[24px] border border-cyan-400/20 bg-slate-950/65 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                Localização instantânea
              </p>

              <form
                className="mt-3 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  searchContainer();
                }}
              >
                <input
                  value={containerSearch}
                  onChange={(event) => {
                    setContainerSearch(event.target.value.toUpperCase());
                    setContainerSearchResults([]);
                    setContainerSearchError("");
                  }}
                  placeholder="Digite o número do contêiner"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-cyan-400/40"
                />

                <button
                  type="submit"
                  disabled={
                    searchingContainer || containerSearch.trim().length < 3
                  }
                  className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {searchingContainer ? "Localizando..." : "Localizar"}
                </button>
              </form>

              {containerSearchError ? (
                <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {containerSearchError}
                </div>
              ) : null}

              {containerSearchResults.length > 0 ? (
                <div className="absolute left-4 right-4 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-900 shadow-2xl">
                  {containerSearchResults.map((container) => (
                    <button
                      key={container.id}
                      type="button"
                      onClick={() => focusContainerOnMap(container)}
                      className="flex w-full flex-col gap-1 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-cyan-500/10 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black text-slate-100">
                          {container.numeroContainer}
                        </p>
                        <p className="text-xs text-slate-400">
                          {container.cliente || "Sem cliente"} • {container.armador || "Sem armador"}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm font-black text-cyan-200">
                          {container.posicao || "Sem posição"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {container.unidade} • {container.patio || "-"} • {container.quadra || "-"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              [
                "Capacidade original",
                totals.capacidadeOriginal,
              ],
              [
                "Capacidade operacional",
                totals.capacidadeOperacional,
              ],
              ["Ocupados", totals.ocupacao],
              ["Livres", totals.livres],
              [
                "Ocupação geral",
                `${totals.percentual.toFixed(1)}%`,
              ],
              ["Quadras críticas", totals.criticas],
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
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Buscar pátio, quadra, código ou status"
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
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none"
              >
                <option>Todos</option>
                <option>Operando</option>
                <option>Operação Restrita</option>
                <option>Em Manutenção</option>
                <option>Bloqueada</option>
                <option>Inativa</option>
              </select>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-6">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                  Carregando mapa do pátio...
                </div>
              ) : null}

              {!loading &&
                patiosComQuadras.map(
                  ({
                    patio,
                    quadras: patioQuadras,
                  }) => {
                    const ocupacao =
                      patioQuadras.reduce(
                        (sum, item) =>
                          sum + item.ocupacao,
                        0,
                      );

                    const capacidade =
                      patioQuadras.reduce(
                        (sum, item) =>
                          sum +
                          item.capacidadeOperacional,
                        0,
                      );

                    return (
                      <section
                        key={patio.id}
                        className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5"
                      >
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-400">
                              {patio.unidade}
                            </p>

                            <h2 className="mt-2 text-2xl font-black">
                              {patio.nome}
                            </h2>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm">
                            <strong>{ocupacao}</strong>{" "}
                            de{" "}
                            <strong>{capacidade}</strong>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                          {patioQuadras.map(
                            (quadra) => (
                              <button
                                key={quadra.id}
                                type="button"
                                onClick={() =>
                                  openQuadra(quadra)
                                }
                                className={`rounded-[26px] border bg-slate-900/75 p-5 text-left shadow-xl transition hover:-translate-y-1 hover:bg-slate-900 ${borderClass(
                                  quadra,
                                )}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                      {quadra.codigo}
                                    </p>

                                    <h3 className="mt-2 text-xl font-black">
                                      {quadra.nome}
                                    </h3>
                                  </div>

                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-black ${
                                      statusClasses[
                                        quadra.status
                                      ]
                                    }`}
                                  >
                                    {quadra.status}
                                  </span>
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-2">
                                  {[
                                    [
                                      "Ocupados",
                                      quadra.ocupacao,
                                    ],
                                    [
                                      "Capacidade",
                                      quadra.capacidadeOperacional,
                                    ],
                                    [
                                      "Livres",
                                      quadra.livres,
                                    ],
                                  ].map(
                                    ([label, value]) => (
                                      <div
                                        key={String(
                                          label,
                                        )}
                                        className="rounded-2xl bg-slate-950/65 p-3"
                                      >
                                        <p className="text-xs text-slate-500">
                                          {label}
                                        </p>

                                        <p className="mt-1 text-xl font-black">
                                          {value}
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </div>

                                <div className="mt-4">
                                  <div className="flex justify-between text-xs text-slate-400">
                                    <span>
                                      Utilização
                                    </span>

                                    <strong className="text-slate-200">
                                      {quadra.percentualOcupacao.toFixed(
                                        1,
                                      )}
                                      %
                                    </strong>
                                  </div>

                                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-950">
                                    <div
                                      className={`h-full rounded-full ${progressClass(
                                        quadra,
                                      )}`}
                                      style={{
                                        width: `${quadra.percentualOcupacao}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">
                                  Clique para abrir a
                                  quadra
                                </p>
                              </button>
                            ),
                          )}
                        </div>
                      </section>
                    );
                  },
                )}
            </div>
          </section>
        </div>
      </main>

      {selectedQuadra ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
          <div className="max-h-[94vh] w-full max-w-[1500px] overflow-y-auto rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                  Conteúdo da quadra
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {selectedQuadra.nome}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedQuadra.patioNome} •{" "}
                  {selectedQuadra.unidade}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openQuadraStatus(selectedQuadra)}
                  className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-500/20"
                >
                  Alterar status
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode("mapa")
                  }
                  className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                    viewMode === "mapa"
                      ? "bg-emerald-500 text-slate-950"
                      : "border border-white/10 bg-slate-950"
                  }`}
                >
                  Mapa
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode("cards")
                  }
                  className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                    viewMode === "cards"
                      ? "bg-emerald-500 text-slate-950"
                      : "border border-white/10 bg-slate-950"
                  }`}
                >
                  Lista
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuadra(null);
                    setReservas([]);
                    setSelectedReserva(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                [
                  "Ocupados",
                  selectedQuadra.ocupacao,
                ],
                [
                  "Reservados",
                  reservas.length,
                ],
                [
                  "Capacidade",
                  selectedQuadra.capacidadeOperacional,
                ],
                ["Livres", selectedQuadra.livres],
                [
                  "Utilização",
                  `${selectedQuadra.percentualOcupacao.toFixed(
                    1,
                  )}%`,
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {loadingContainers ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                Carregando contêineres...
              </div>
            ) : null}

            {!loadingContainers &&
            viewMode === "mapa" ? (
              <div className="mt-6">
                <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
                  <aside className="rounded-[26px] border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Configuração visual
                    </p>

                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-slate-400">
                          Quantidade de pilhas
                        </span>

                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={maxPilhas}
                          onChange={(event) =>
                            setMaxPilhas(
                              Math.max(
                                1,
                                Number(
                                  event.target.value,
                                ) || 1,
                              ),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-slate-400">
                          Quantidade de filas
                        </span>

                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={maxFilas}
                          onChange={(event) =>
                            setMaxFilas(
                              Math.max(
                                1,
                                Number(
                                  event.target.value,
                                ) || 1,
                              ),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-slate-400">
                          Altura máxima
                        </span>

                        <select
                          value={maxAlturas}
                          onChange={(event) =>
                            setMaxAlturas(
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6].map(
                            (value) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {value} de alto
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Selecionar pilha
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {Array.from(
                          { length: maxPilhas },
                          (_, index) => index + 1,
                        ).map((pilha) => {
                          const count =
                            containers.filter(
                              (container) =>
                                numberFromPositionPart(
                                  container.pilha,
                                ) === pilha,
                            ).length;

                          const reservedCount =
                            reservas.filter(
                              (reserva) =>
                                numberFromPositionPart(
                                  reserva.pilhaReservada,
                                ) === pilha,
                            ).length;

                          return (
                            <button
                              type="button"
                              key={pilha}
                              onClick={() =>
                                setSelectedPilha(
                                  pilha,
                                )
                              }
                              className={`rounded-xl border p-3 text-sm font-black ${
                                selectedPilha === pilha
                                  ? "border-emerald-400 bg-emerald-500 text-slate-950"
                                  : "border-white/10 bg-slate-900 text-slate-200"
                              }`}
                            >
                              P
                              {String(
                                pilha,
                              ).padStart(2, "0")}
                              <span className="mt-1 block text-[10px] font-bold opacity-70">
                                {count} oc. • {reservedCount} res.
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {movingContainer ? (
                      <div className="mt-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
                          Movimentação ativa
                        </p>

                        <p className="mt-2 font-black text-slate-50">
                          {movingContainer.numeroContainer}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Origem: {movingContainer.posicao || "-"}
                        </p>

                        <p className="mt-3 text-xs text-cyan-100">
                          Selecione uma posição livre na grade.
                        </p>

                        <button
                          type="button"
                          onClick={cancelMove}
                          className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold"
                        >
                          Cancelar movimentação
                        </button>
                      </div>
                    ) : null}

                    {moveSuccess ? (
                      <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                        {moveSuccess}
                      </div>
                    ) : null}

                    <div className="mt-6 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-3 w-3 rounded bg-emerald-500" />
                        Posição livre
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-3 w-3 rounded bg-amber-400" />
                        Posição reservada
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-3 w-3 rounded bg-rose-500" />
                        Posição ocupada
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="h-3 w-3 rounded bg-orange-500" />
                        Programado para saída
                      </div>
                    </div>
                  </aside>

                  <section className="min-w-0 rounded-[26px] border border-white/10 bg-slate-950/60 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-400">
                          Grade física
                        </p>

                        <h3 className="mt-2 text-2xl font-black">
                          Pilha{" "}
                          {String(
                            selectedPilha,
                          ).padStart(2, "0")}
                        </h3>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm">
                        <strong>
                          {occupiedInSelectedPilha}
                        </strong>{" "}
                        ocupada(s) •{" "}
                        <strong className="text-amber-200">
                          {reservedInSelectedPilha}
                        </strong>{" "}
                        reservada(s)
                      </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                      <div
                        className="grid min-w-max gap-2"
                        style={{
                          gridTemplateColumns: `76px repeat(${maxFilas}, minmax(112px, 1fr))`,
                        }}
                      >
                        <div className="flex items-center justify-center rounded-xl bg-slate-900 px-2 py-3 text-xs font-black text-slate-400">
                          ALTURA
                        </div>

                        {Array.from(
                          { length: maxFilas },
                          (_, index) => index + 1,
                        ).map((fila) => (
                          <div
                            key={`header-${fila}`}
                            className="flex items-center justify-center rounded-xl bg-slate-900 px-2 py-3 text-xs font-black text-cyan-200"
                          >
                            F
                            {String(fila).padStart(
                              2,
                              "0",
                            )}
                          </div>
                        ))}

                        {Array.from(
                          { length: maxAlturas },
                          (_, index) =>
                            maxAlturas - index,
                        ).flatMap((altura) => [
                          <div
                            key={`altura-${altura}`}
                            className="flex items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-2 py-4 text-sm font-black text-violet-200"
                          >
                            H
                            {String(
                              altura,
                            ).padStart(2, "0")}
                          </div>,

                          ...slotsDaPilha
                            .filter(
                              (slot) =>
                                slot.altura ===
                                altura,
                            )
                            .map((slot) => {
                              const occupied =
                                slot.container;

                              const reserved =
                                reservaBySlot.get(
                                  getSlotKey(
                                    slot.pilha,
                                    slot.fila,
                                    slot.altura,
                                  ),
                                ) ?? null;

                              const scheduled =
                                occupied?.status ===
                                "Programado para Saída";

                              return (
                                <button
                                  type="button"
                                  key={getSlotKey(
                                    slot.pilha,
                                    slot.fila,
                                    slot.altura,
                                  )}
                                  onClick={() => {
                                    if (occupied) {
                                      setSelectedContainer(occupied);
                                      return;
                                    }

                                    if (reserved) {
                                      setSelectedReserva(reserved);
                                      return;
                                    }

                                    if (movingContainer) {
                                      setTargetSlot(slot);
                                      setMoveError("");
                                    }
                                  }}
                                  className={`min-h-[86px] rounded-xl border p-2 text-left transition ${
                                    occupied
                                      ? scheduled
                                        ? "border-orange-400/40 bg-orange-500/15 hover:bg-orange-500/25"
                                        : "border-rose-400/40 bg-rose-500/15 hover:bg-rose-500/25"
                                      : reserved
                                        ? "border-amber-300/50 bg-amber-500/15 hover:bg-amber-500/25"
                                        : targetSlot &&
                                            targetSlot.pilha === slot.pilha &&
                                            targetSlot.fila === slot.fila &&
                                            targetSlot.altura === slot.altura
                                          ? "border-cyan-300 bg-cyan-500/25 ring-2 ring-cyan-300/50"
                                          : movingContainer
                                            ? "cursor-pointer border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20"
                                            : "border-emerald-400/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                                  }`}
                                >
                                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                    P
                                    {String(
                                      slot.pilha,
                                    ).padStart(
                                      2,
                                      "0",
                                    )}
                                    -F
                                    {String(
                                      slot.fila,
                                    ).padStart(
                                      2,
                                      "0",
                                    )}
                                    -H
                                    {String(
                                      slot.altura,
                                    ).padStart(
                                      2,
                                      "0",
                                    )}
                                  </p>

                                  {occupied ? (
                                    <>
                                      <p className="mt-2 text-sm font-black text-slate-50">
                                        {getContainerShortName(
                                          occupied.numeroContainer,
                                        )}
                                      </p>

                                      <p className="mt-1 truncate text-[11px] text-slate-400">
                                        {occupied.cliente ||
                                          "Sem cliente"}
                                      </p>
                                    </>
                                  ) : reserved ? (
                                    <>
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-amber-100">
                                          {getContainerShortName(
                                            reserved.numeroContainer,
                                          )}
                                        </p>

                                        <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-2 py-1 text-[9px] font-black uppercase text-amber-100">
                                          Reservado
                                        </span>
                                      </div>

                                      <p className="mt-1 truncate text-[11px] text-amber-100/70">
                                        {reserved.cliente ||
                                          "Sem cliente"} •{" "}
                                        {minutosDesde(
                                          reserved.reservadoEm,
                                        )} min
                                      </p>
                                    </>
                                  ) : (
                                    <p
                                      className={`mt-4 text-center text-xs font-bold ${
                                        movingContainer
                                          ? "text-cyan-200"
                                          : "text-emerald-300"
                                      }`}
                                    >
                                      {movingContainer
                                        ? targetSlot &&
                                          targetSlot.pilha === slot.pilha &&
                                          targetSlot.fila === slot.fila &&
                                          targetSlot.altura === slot.altura
                                          ? "Destino"
                                          : "Selecionar"
                                        : "Livre"}
                                    </p>
                                  )}
                                </button>
                              );
                            }),
                        ])}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {!loadingContainers &&
            viewMode === "cards" ? (
              <div className="mt-6">
                {containers.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                    Nenhum contêiner armazenado nesta
                    quadra.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {containers.map((container) => (
                      <button
                        type="button"
                        key={container.id}
                        onClick={() =>
                          setSelectedContainer(
                            container,
                          )
                        }
                        className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5 text-left transition hover:border-emerald-400/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Contêiner
                            </p>

                            <h3 className="mt-1 text-xl font-black">
                              {
                                container.numeroContainer
                              }
                            </h3>
                          </div>

                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200">
                            {container.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl bg-slate-900 p-3">
                            <p className="text-xs text-slate-500">
                              Posição
                            </p>

                            <p className="mt-1 font-black text-violet-200">
                              {container.posicao ||
                                "-"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-900 p-3">
                            <p className="text-xs text-slate-500">
                              Condição
                            </p>

                            <p className="mt-1 font-bold">
                              {container.condicao ||
                                "-"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-900 p-3">
                            <p className="text-xs text-slate-500">
                              Cliente
                            </p>

                            <p className="mt-1 truncate font-bold">
                              {container.cliente ||
                                "-"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-900 p-3">
                            <p className="text-xs text-slate-500">
                              Armador
                            </p>

                            <p className="mt-1 truncate font-bold">
                              {container.armador ||
                                "-"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}

                    {reservas.map((reserva) => (
                      <button
                        type="button"
                        key={`reserva-${reserva.id}`}
                        onClick={() =>
                          setSelectedReserva(reserva)
                        }
                        className="rounded-[24px] border border-amber-400/30 bg-amber-500/10 p-5 text-left transition hover:bg-amber-500/15"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-amber-200/70">
                              Reserva operacional
                            </p>

                            <h3 className="mt-1 text-xl font-black">
                              {reserva.numeroContainer}
                            </h3>
                          </div>

                          <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-100">
                            Aguardando operador
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl bg-slate-900/80 p-3">
                            <p className="text-xs text-slate-500">
                              Posição reservada
                            </p>

                            <p className="mt-1 font-black text-amber-200">
                              {reserva.posicaoReservada}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-900/80 p-3">
                            <p className="text-xs text-slate-500">
                              Tempo de reserva
                            </p>

                            <p className="mt-1 font-bold">
                              {minutosDesde(reserva.reservadoEm)} min
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-900/80 p-3">
                            <p className="text-xs text-slate-500">
                              Cliente
                            </p>

                            <p className="mt-1 truncate font-bold">
                              {reserva.cliente || "-"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-900/80 p-3">
                            <p className="text-xs text-slate-500">
                              Armador
                            </p>

                            <p className="mt-1 truncate font-bold">
                              {reserva.armador || "-"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}


      {editingQuadra && quadraForm ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <form
            onSubmit={saveQuadraStatus}
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-amber-400/25 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                  Configuração operacional
                </p>
                <h3 className="mt-2 text-3xl font-black">
                  {editingQuadra.nome}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {editingQuadra.patioNome} • {editingQuadra.unidade}
                </p>
              </div>

              <button
                type="button"
                onClick={closeQuadraStatus}
                disabled={savingQuadra}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold disabled:opacity-50"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Status da quadra
                </span>
                <select
                  value={quadraForm.status}
                  onChange={(event) =>
                    handleQuadraStatusChange(
                      event.target.value as StatusQuadra,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                >
                  <option>Operando</option>
                  <option>Operação Restrita</option>
                  <option>Em Manutenção</option>
                  <option>Bloqueada</option>
                  <option>Inativa</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Capacidade operacional
                </span>
                <input
                  type="number"
                  min={0}
                  max={editingQuadra.capacidadeOriginal}
                  value={quadraForm.capacidadeOperacional}
                  onChange={(event) =>
                    updateQuadraForm(
                      "capacidadeOperacional",
                      event.target.value,
                    )
                  }
                  disabled={
                    quadraForm.status === "Em Manutenção" ||
                    quadraForm.status === "Bloqueada" ||
                    quadraForm.status === "Inativa"
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Original: {editingQuadra.capacidadeOriginal} • Ocupados: {editingQuadra.ocupacao}
                </p>

                {quadraForm.status === "Operando" &&
                editingQuadra.capacidadeOriginal <= 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
                    A capacidade original desta quadra está zerada no banco.
                    Informe manualmente a capacidade correta para liberar a operação.
                  </div>
                ) : null}
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Armazenamento
                </span>
                <select
                  value={
                    quadraForm.permiteArmazenamento
                      ? "Permitido"
                      : "Bloqueado"
                  }
                  onChange={(event) =>
                    updateQuadraForm(
                      "permiteArmazenamento",
                      event.target.value === "Permitido",
                    )
                  }
                  disabled={
                    quadraForm.status === "Em Manutenção" ||
                    quadraForm.status === "Bloqueada" ||
                    quadraForm.status === "Inativa"
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none disabled:opacity-50"
                >
                  <option>Permitido</option>
                  <option>Bloqueado</option>
                </select>
              </label>

              {quadraForm.status !== "Operando" ? (
                <>
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Motivo da restrição *
                    </span>
                    <input
                      value={quadraForm.motivoRestricao}
                      onChange={(event) =>
                        updateQuadraForm(
                          "motivoRestricao",
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: manutenção, interdição ou capacidade parcial"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Início da restrição
                    </span>
                    <input
                      type="datetime-local"
                      value={quadraForm.inicioRestricao}
                      onChange={(event) =>
                        updateQuadraForm(
                          "inicioRestricao",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-bold text-slate-400">
                      Previsão de liberação
                    </span>
                    <input
                      type="datetime-local"
                      value={quadraForm.previsaoLiberacao}
                      onChange={(event) =>
                        updateQuadraForm(
                          "previsaoLiberacao",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                    />
                  </label>
                </>
              ) : null}

              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Observações
                </span>
                <textarea
                  rows={3}
                  value={quadraForm.observacoes}
                  onChange={(event) =>
                    updateQuadraForm(
                      "observacoes",
                      event.target.value,
                    )
                  }
                  placeholder="Opcional"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                />
              </label>
            </div>

            {quadraEditError ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
                {quadraEditError}
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeQuadraStatus}
                disabled={savingQuadra}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={savingQuadra}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {savingQuadra
                  ? "Salvando..."
                  : quadraForm.status === "Operando"
                    ? "Liberar quadra"
                    : "Salvar configuração"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {targetSlot && movingContainer && selectedQuadra ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="w-full max-w-xl rounded-[28px] border border-cyan-400/25 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              Confirmar movimentação
            </p>

            <h3 className="mt-2 text-2xl font-black">
              {movingContainer.numeroContainer}
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">Origem</p>
                <p className="mt-1 font-black text-rose-200">
                  {movingContainer.posicao || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs text-cyan-200/70">Destino</p>
                <p className="mt-1 font-black text-cyan-100">
                  P{String(targetSlot.pilha).padStart(2, "0")}-F
                  {String(targetSlot.fila).padStart(2, "0")}-H
                  {String(targetSlot.altura).padStart(2, "0")}
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold text-slate-400">
                Observação
              </span>

              <textarea
                value={moveObservation}
                onChange={(event) => setMoveObservation(event.target.value)}
                rows={3}
                placeholder="Opcional"
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
              />
            </label>

            {moveError ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">
                {moveError}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetSlot(null)}
                disabled={savingMove}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmMove}
                disabled={savingMove}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {savingMove ? "Movimentando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {historyContainer ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-violet-400/20 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                  Histórico operacional
                </p>

                <h3 className="mt-2 text-3xl font-black">
                  {historyContainer.numeroContainer}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Rastreabilidade completa do contêiner
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHistoryContainer(null);
                  setTimeline([]);
                  setTimelineError("");
                }}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            {loadingTimeline ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                Carregando histórico...
              </div>
            ) : null}

            {timelineError ? (
              <div className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">
                {timelineError}
              </div>
            ) : null}

            {!loadingTimeline && !timelineError && timeline.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-400">
                Nenhum evento registrado para este contêiner.
              </div>
            ) : null}

            {!loadingTimeline && timeline.length > 0 ? (
              <div className="mt-6 space-y-4">
                {timeline
                  .slice()
                  .reverse()
                  .map((event, index) => (
                    <article
                      key={event.id}
                      className="relative rounded-[24px] border border-white/10 bg-slate-950/65 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/15 text-sm font-black text-violet-200">
                            {timeline.length - index}
                          </div>

                          <div>
                            <p className="text-lg font-black text-slate-100">
                              {event.tipoEvento}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {event.statusAnterior || "Sem status anterior"}
                              {" → "}
                              {event.statusNovo}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300">
                          {formatDate(event.criadoEm)}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Origem
                          </p>

                          <p className="mt-2 font-black text-rose-200">
                            {event.posicaoAnterior || "-"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {event.patioAnterior || "Sem pátio informado"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Destino
                          </p>

                          <p className="mt-2 font-black text-emerald-200">
                            {event.posicaoNova || "-"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {event.patioNovo || "Sem pátio informado"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-4">
                          <p className="text-xs text-slate-500">Responsável</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {event.usuarioNome || "Não identificado"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-4">
                          <p className="text-xs text-slate-500">Motivo</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {event.motivo || "-"}
                          </p>
                        </div>
                      </div>

                      {event.observacao ? (
                        <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4">
                          <p className="text-xs text-amber-200/70">Observação</p>
                          <p className="mt-1 text-sm text-amber-100">
                            {event.observacao}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedReserva ? (
        <div className="fixed inset-0 z-[62] flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="w-full max-w-xl rounded-[28px] border border-amber-400/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                  Posição reservada
                </p>

                <h3 className="mt-2 text-3xl font-black">
                  {selectedReserva.numeroContainer}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Aguardando confirmação física do operador
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReserva(null)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                Destino protegido
              </p>

              <p className="mt-2 text-3xl font-black text-amber-100">
                {selectedReserva.posicaoReservada}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {selectedReserva.unidade} •{" "}
                {selectedReserva.patioReservado || "-"} •{" "}
                {selectedReserva.quadraReservada || "-"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Cliente", selectedReserva.cliente || "-"],
                ["Armador", selectedReserva.armador || "-"],
                ["Condição", selectedReserva.condicao || "-"],
                ["Placa", selectedReserva.placaAtual || "-"],
                [
                  "Reservada há",
                  `${minutosDesde(selectedReserva.reservadoEm)} min`,
                ],
                [
                  "Reservada em",
                  formatDate(selectedReserva.reservadoEm),
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 font-black text-slate-100">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {selectedReserva.observacaoReserva ? (
              <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4">
                <p className="text-xs text-cyan-200/70">
                  Instrução ao operador
                </p>

                <p className="mt-1 text-sm text-cyan-100">
                  {selectedReserva.observacaoReserva}
                </p>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100">
              Esta posição não pode ser utilizada por outro contêiner
              enquanto a reserva estiver ativa.
            </div>
          </div>
        </div>
      ) : null}

      {selectedContainer ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur">
          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
                  Detalhes da posição
                </p>

                <h3 className="mt-2 text-3xl font-black">
                  {
                    selectedContainer.numeroContainer
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedContainer(null)
                }
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                [
                  "Posição",
                  selectedContainer.posicao || "-",
                ],
                [
                  "Status",
                  selectedContainer.status || "-",
                ],
                [
                  "Cliente",
                  selectedContainer.cliente || "-",
                ],
                [
                  "Armador",
                  selectedContainer.armador || "-",
                ],
                [
                  "Condição",
                  selectedContainer.condicao || "-",
                ],
                [
                  "Permanência",
                  `${permanencia(
                    selectedContainer.entradaEm,
                  )} dia(s)`,
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 font-black text-slate-100">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">
                Data de entrada
              </p>

              <p className="mt-1 font-bold text-slate-200">
                {formatDate(
                  selectedContainer.entradaEm,
                )}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => startMove(selectedContainer)}
                className="rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
              >
                Mover no mapa
              </button>

              <button
                type="button"
                onClick={() => openHistory(selectedContainer)}
                className="rounded-2xl bg-violet-500 px-4 py-3 font-black text-white transition hover:bg-violet-400"
              >
                Ver histórico
              </button>

              <button
                type="button"
                onClick={() => setSelectedContainer(null)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
