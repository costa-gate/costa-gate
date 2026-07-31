"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { moveContainerToStack } from "@/lib/containers";
import {
  listarQuadras,
  subscribeToPatios,
  type QuadraTerminal,
} from "@/lib/patios";
import { supabase } from "@/lib/supabase";
import type {
  MotivoMovimentacaoContainer,
  Unidade,
} from "@/types";

type DatabaseRow = Record<string, unknown>;

type ItemFila = {
  id: string;
  numeroContainer: string;
  unidade: string;
  cliente?: string | null;
  armador?: string | null;
  condicao?: string | null;
  status: string;
  placaAtual?: string | null;
  entradaEm?: string | null;
  observacoes?: string | null;
};

type PosicaoAtiva = {
  containerId: string;
  quadraId: string;
  pilha: number;
  fila: number;
  altura: number;
};

type FormPosicionamento = {
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
  value === null || value === undefined
    ? fallback
    : String(value);

const optionalText = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? null
    : String(value);

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeQueueItem = (row: DatabaseRow): ItemFila => ({
  id: text(row.id),
  numeroContainer: text(row.numero_container),
  unidade: text(row.unidade),
  cliente: optionalText(row.cliente),
  armador: optionalText(row.armador),
  condicao: optionalText(row.condicao),
  status: text(row.status),
  placaAtual: optionalText(row.placa_atual),
  entradaEm: optionalText(row.entrada_em),
  observacoes: optionalText(row.observacoes),
});

const normalizePosition = (row: DatabaseRow): PosicaoAtiva | null => {
  const quadraId = optionalText(row.quadra_id);
  const pilha = numberValue(String(row.pilha ?? "").replace(/\D/g, ""));
  const fila = numberValue(String(row.fila ?? "").replace(/\D/g, ""));
  const altura = numberValue(row.altura);

  if (!quadraId || !pilha || !fila || !altura) return null;

  return {
    containerId: text(row.id),
    quadraId,
    pilha,
    fila,
    altura,
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

  return Math.max(
    0,
    Math.floor((Date.now() - start) / 60_000),
  );
};

const positionLabel = (
  pilha: number,
  fila: number,
  altura: number,
) =>
  `P${String(pilha).padStart(2, "0")}-F${String(
    fila,
  ).padStart(2, "0")}-H${String(altura).padStart(2, "0")}`;

const statusLabel = (item: ItemFila) => {
  if (item.status === "Desmontado") return "Aguardando posição";
  if (item.status === "Recebido") return "Recebido no gate";
  return item.status;
};

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

const findFirstOperationalSlot = (
  quadraId: string,
  positions: PosicaoAtiva[],
) => {
  const occupiedByBase = new Map<string, number[]>();

  for (const position of positions) {
    if (position.quadraId !== quadraId) continue;

    const key = `${position.pilha}-${position.fila}`;
    const heights = occupiedByBase.get(key) ?? [];

    heights.push(position.altura);
    occupiedByBase.set(key, heights);
  }

  for (let pilha = 1; pilha <= PILHAS_PADRAO; pilha += 1) {
    for (let fila = 1; fila <= FILAS_PADRAO; fila += 1) {
      const key = `${pilha}-${fila}`;
      const heights = occupiedByBase.get(key) ?? [];
      const highest = heights.length > 0 ? Math.max(...heights) : 0;
      const nextHeight = highest + 1;

      if (nextHeight <= ALTURA_MAXIMA) {
        return {
          pilha,
          fila,
          altura: nextHeight,
        };
      }
    }
  }

  return {
    pilha: 1,
    fila: 1,
    altura: 1,
  };
};

export default function FilaOperacionalPage() {
  const [queue, setQueue] = useState<ItemFila[]>([]);
  const [quadras, setQuadras] = useState<QuadraTerminal[]>([]);
  const [positions, setPositions] = useState<PosicaoAtiva[]>([]);

  const [selectedItem, setSelectedItem] =
    useState<ItemFila | null>(null);

  const [form, setForm] = useState<FormPosicionamento>({
    quadraId: "",
    pilha: 1,
    fila: 1,
    altura: 1,
    observacao: "",
  });

  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        { data: queueData, error: queueError },
        { data: positionData, error: positionError },
        quadraData,
      ] = await Promise.all([
        supabase
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
            observacoes,
            quadra_id
          `)
          .neq("status", "Saiu")
          .is("quadra_id", null)
          .order("entrada_em", { ascending: true }),

        supabase
          .from("containers_terminal")
          .select("id, quadra_id, pilha, fila, altura")
          .neq("status", "Saiu")
          .not("quadra_id", "is", null),

        listarQuadras(),
      ]);

      if (queueError) throw new Error(queueError.message);
      if (positionError) throw new Error(positionError.message);

      setQueue(
        (queueData ?? []).map((row) =>
          normalizeQueueItem(row as DatabaseRow),
        ),
      );

      setPositions(
        (positionData ?? [])
          .map((row) => normalizePosition(row as DatabaseRow))
          .filter(
            (item): item is PosicaoAtiva => item !== null,
          ),
      );

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

    const containerChannel = supabase.channel(
      `fila-operacional-${crypto.randomUUID()}`,
    );

    containerChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "containers_terminal",
      },
      loadData,
    );

    containerChannel.subscribe();

    const unsubscribePatios = subscribeToPatios(loadData);

    return () => {
      supabase.removeChannel(containerChannel);
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
        statusFilter !== "Todos" &&
        statusLabel(item) !== statusFilter
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
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    });
  }, [queue, query, unitFilter, statusFilter]);

  const metrics = useMemo(() => {
    const aguardando = queue.length;
    const acima30 = queue.filter(
      (item) => elapsedMinutes(item.entradaEm) >= 30,
    ).length;
    const acima60 = queue.filter(
      (item) => elapsedMinutes(item.entradaEm) >= 60,
    ).length;
    const average =
      queue.length > 0
        ? Math.round(
            queue.reduce(
              (sum, item) =>
                sum + elapsedMinutes(item.entradaEm),
              0,
            ) / queue.length,
          )
        : 0;

    return {
      aguardando,
      acima30,
      acima60,
      average,
    };
  }, [queue]);

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

  const openPositioning = (item: ItemFila) => {
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
          positions,
        )
      : {
          pilha: 1,
          fila: 1,
          altura: 1,
        };

    setSelectedItem(item);
    setForm({
      quadraId: suggestedQuadra?.id ?? "",
      pilha: suggestedSlot.pilha,
      fila: suggestedSlot.fila,
      altura: suggestedSlot.altura,
      observacao: "",
    });
    setError("");
    setSuccess("");
  };

  const changeQuadra = (quadraId: string) => {
    const suggestedSlot = findFirstOperationalSlot(
      quadraId,
      positions,
    );

    setForm((current) => ({
      ...current,
      quadraId,
      pilha: suggestedSlot.pilha,
      fila: suggestedSlot.fila,
      altura: suggestedSlot.altura,
    }));
  };

  const positionIsOccupied = useMemo(
    () =>
      positions.some(
        (position) =>
          position.quadraId === form.quadraId &&
          position.pilha === form.pilha &&
          position.fila === form.fila &&
          position.altura === form.altura,
      ),
    [
      positions,
      form.quadraId,
      form.pilha,
      form.fila,
      form.altura,
    ],
  );

  const confirmPosition = async () => {
    if (!selectedItem || !selectedQuadra) {
      setError("Selecione uma quadra operacional.");
      return;
    }

    if (positionIsOccupied) {
      setError(
        `A posição ${positionLabel(
          form.pilha,
          form.fila,
          form.altura,
        )} já está ocupada.`,
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await moveContainerToStack({
        containerId: selectedItem.id,
        unidade: selectedItem.unidade as Unidade,
        patio: selectedQuadra.patioNome,
        quadraId: selectedQuadra.id,
        quadra: selectedQuadra.nome,
        pilha: String(form.pilha),
        fila: String(form.fila),
        altura: form.altura,
        motivo:
          "Armazenamento" as MotivoMovimentacaoContainer,
        observacao:
          form.observacao.trim() ||
          `Posicionamento definido pelo conferente em ${positionLabel(
            form.pilha,
            form.fila,
            form.altura,
          )}`,
        movimentoId: null,
      });

      setSuccess(
        `${selectedItem.numeroContainer} enviado para ${positionLabel(
          form.pilha,
          form.fila,
          form.altura,
        )}.`,
      );

      setSelectedItem(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o posicionamento.",
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

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  O AGP registra a entrada. O conferente define
                  ou ajusta a posição. A operação segue sem
                  bloqueios desnecessários.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200">
                Atualização em tempo real
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Aguardando posição", metrics.aguardando],
              ["Acima de 30 min", metrics.acima30],
              ["Acima de 60 min", metrics.acima60],
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
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_230px]">
              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Buscar contêiner, cliente, armador ou placa"
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
                <option>Recebido no gate</option>
                <option>Aguardando posição</option>
              </select>
            </div>

            {error && !selectedItem ? (
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

              {!loading && filteredQueue.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-10 text-center">
                  <p className="text-xl font-black text-emerald-200">
                    Fila zerada
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Nenhum contêiner aguarda posicionamento.
                  </p>
                </div>
              ) : null}

              {!loading && filteredQueue.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredQueue.map((item) => {
                    const minutes = elapsedMinutes(item.entradaEm);

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
                          </div>

                          <span
                            className={`rounded-full border px-3 py-2 text-xs font-black ${priorityClass(
                              minutes,
                            )}`}
                          >
                            {minutes} min na fila
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {[
                            ["Unidade", item.unidade],
                            ["Status", statusLabel(item)],
                            ["Condição", item.condicao || "-"],
                            ["Placa", item.placaAtual || "-"],
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

                        <div className="mt-3 rounded-2xl border border-white/5 bg-slate-900/70 p-3">
                          <p className="text-xs text-slate-500">
                            Entrada registrada pelo gate
                          </p>

                          <p className="mt-1 font-bold">
                            {formatDate(item.entradaEm)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openPositioning(item)}
                          className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400"
                        >
                          Definir posição
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
                  Posicionamento pelo conferente
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {selectedItem.numeroContainer}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  A sugestão é automática, mas todos os campos
                  continuam editáveis.
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
                Sugestão não bloqueante
              </p>

              <p className="mt-2 text-sm text-cyan-50">
                O sistema preenche uma posição disponível. O
                conferente pode alterar e o operador poderá
                corrigir posteriormente pelo mapa.
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
                  Endereço definido
                </p>

                <p
                  className={`mt-2 text-xl font-black ${
                    positionIsOccupied
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
                  {positionIsOccupied
                    ? "Posição ocupada"
                    : "Posição disponível"}
                </p>
              </div>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-bold text-slate-400">
                  Observação operacional
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
                  placeholder="Opcional"
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
                onClick={confirmPosition}
                disabled={
                  saving ||
                  !selectedQuadra ||
                  positionIsOccupied
                }
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Confirmando..."
                  : "Confirmar posição"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
