"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import {
  formatPermanencia,
  getActiveMovements,
  subscribeToMovements,
} from "@/lib/movements";
import type { VehicleMovement } from "@/types";

export default function PainelOperacionalPage() {
  const [data, setData] = useState<VehicleMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
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
          : "Falha ao carregar o painel operacional."
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
      setCurrentTime(new Date());
      setClockTick((current) => current + 1);
    }, 1_000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const getHoursInside = (iso: string) =>
    Math.max(0, (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));

  const formatDuration = (iso: string) =>
    formatPermanencia(iso, undefined);

  const formatDurationWithSeconds = (iso: string) => {
    const totalSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(
      seconds
    ).padStart(2, "0")}s`;
  };

  const getPriority = (iso: string) => {
    const hours = getHoursInside(iso);

    if (hours >= 24) {
      return {
        label: "CRÍTICO",
        icon: "🔴",
        classes:
          "border-rose-400/40 bg-rose-500/15 text-rose-100",
        bar: "bg-rose-500",
      };
    }

    if (hours >= 6) {
      return {
        label: "URGENTE",
        icon: "🟠",
        classes:
          "border-orange-400/40 bg-orange-500/15 text-orange-100",
        bar: "bg-orange-500",
      };
    }

    if (hours >= 2) {
      return {
        label: "ATENÇÃO",
        icon: "🟡",
        classes:
          "border-amber-400/40 bg-amber-500/15 text-amber-100",
        bar: "bg-amber-400",
      };
    }

    return {
      label: "NORMAL",
      icon: "🟢",
      classes:
        "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
      bar: "bg-emerald-500",
    };
  };

  const formatHoursMetric = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.floor((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          new Date(a.entrada).getTime() -
          new Date(b.entrada).getTime()
      ),
    [data]
  );

  const jav1 = data.filter((vehicle) => vehicle.unidade === "JAV 1");
  const jav2 = data.filter((vehicle) => vehicle.unidade === "JAV 2");

  const totalCriticos = data.filter(
    (vehicle) => getHoursInside(vehicle.entrada) >= 24
  ).length;

  const totalUrgentes = data.filter((vehicle) => {
    const hours = getHoursInside(vehicle.entrada);
    return hours >= 6 && hours < 24;
  }).length;

  const totalAtencao = data.filter((vehicle) => {
    const hours = getHoursInside(vehicle.entrada);
    return hours >= 2 && hours < 6;
  }).length;

  const totalNormais = data.filter(
    (vehicle) => getHoursInside(vehicle.entrada) < 2
  ).length;

  const mediaPermanencia =
    data.length > 0
      ? data.reduce(
          (total, vehicle) => total + getHoursInside(vehicle.entrada),
          0
        ) / data.length
      : 0;

  const maiorPermanencia =
    data.length > 0
      ? Math.max(...data.map((vehicle) => getHoursInside(vehicle.entrada)))
      : 0;

  const topPrioridades = sorted.slice(0, 10);

  const renderUnitCard = (
    title: string,
    vehicles: VehicleMovement[],
    accent: "emerald" | "cyan"
  ) => {
    const critical = vehicles.filter(
      (vehicle) => getHoursInside(vehicle.entrada) >= 24
    ).length;

    const attention = vehicles.filter((vehicle) => {
      const hours = getHoursInside(vehicle.entrada);
      return hours >= 2 && hours < 24;
    }).length;

    const accentClasses =
      accent === "emerald"
        ? "border-emerald-400/25 bg-emerald-500/8 text-emerald-200"
        : "border-cyan-400/25 bg-cyan-500/8 text-cyan-200";

    return (
      <div className={`rounded-3xl border p-6 ${accentClasses}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
              Unidade
            </p>
            <h2 className="mt-2 text-3xl font-black">{title}</h2>
          </div>

          <div className="text-right">
            <p className="text-5xl font-black tabular-nums">
              {vehicles.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              veículos
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs text-slate-500">Normais</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {
                vehicles.filter(
                  (vehicle) => getHoursInside(vehicle.entrada) < 2
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs text-slate-500">Atenção</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {attention}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs text-slate-500">Críticos</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">
              {critical}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />

      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-400">
                  NOC · Centro de Controle
                </p>
                <h1 className="mt-2 text-4xl font-black text-slate-50">
                  Painel Operacional
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Monitoramento em tempo real das operações JAV 1 e JAV 2
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Horário operacional
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    {currentTime.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-3xl font-black tabular-nums text-emerald-300">
                    {currentTime.toLocaleTimeString("pt-BR")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/veiculos-na-unidade"
                    className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900"
                  >
                    Veículos
                  </Link>
                  <Link
                    href="/"
                    className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:bg-slate-900"
                  >
                    Voltar
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {errorMessage ? (
            <div className="mt-6 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Ativos
              </p>
              <p className="mt-3 text-4xl font-black text-slate-50">
                {data.length}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                Normais
              </p>
              <p className="mt-3 text-4xl font-black text-emerald-300">
                {totalNormais}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                Atenção
              </p>
              <p className="mt-3 text-4xl font-black text-amber-300">
                {totalAtencao}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-400/20 bg-orange-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/80">
                Urgentes
              </p>
              <p className="mt-3 text-4xl font-black text-orange-300">
                {totalUrgentes}
              </p>
            </div>

            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/80">
                Críticos
              </p>
              <p className="mt-3 text-4xl font-black text-rose-300">
                {totalCriticos}
              </p>
            </div>

            <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                Tempo médio
              </p>
              <p className="mt-3 text-2xl font-black text-violet-300">
                {formatHoursMetric(mediaPermanencia)}
              </p>
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-2">
            {renderUnitCard("JAV 1", jav1, "emerald")}
            {renderUnitCard("JAV 2", jav2, "cyan")}
          </section>

          <section className="mt-6 grid gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-5 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
                    Top 10
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-50">
                    Prioridades operacionais
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                  Atualizado agora
                </span>
              </div>

              {isLoading ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                  Carregando prioridades...
                </div>
              ) : null}

              {!isLoading && topPrioridades.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                  Nenhum veículo ativo.
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {topPrioridades.map((vehicle, index) => {
                  const priority = getPriority(vehicle.entrada);

                  return (
                    <div
                      key={vehicle.id}
                      className={`relative overflow-hidden rounded-3xl border p-5 ${priority.classes}`}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 w-1.5 ${priority.bar}`}
                      />

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-lg font-black text-slate-200">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                              {priority.icon} {priority.label}
                            </p>
                            <h3 className="mt-2 truncate text-2xl font-black tracking-wide text-white">
                              {vehicle.placaCavalo}
                            </h3>
                            <p className="mt-1 truncate text-sm opacity-80">
                              {vehicle.cliente} · {vehicle.unidade}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-black tabular-nums text-white">
                            {formatDurationWithSeconds(vehicle.entrada)}
                          </p>
                          <p className="mt-1 text-xs opacity-70">
                            {vehicle.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                  Resumo operacional
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-50">
                  Indicadores do turno
                </h2>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <span className="text-sm text-slate-400">
                      Maior permanência
                    </span>
                    <span className="text-lg font-black text-violet-300">
                      {formatHoursMetric(maiorPermanencia)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <span className="text-sm text-slate-400">
                      Veículos JAV 1
                    </span>
                    <span className="text-lg font-black text-emerald-300">
                      {jav1.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <span className="text-sm text-slate-400">
                      Veículos JAV 2
                    </span>
                    <span className="text-lg font-black text-cyan-300">
                      {jav2.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <span className="text-sm text-slate-400">
                      Sincronização
                    </span>
                    <span className="text-sm font-black text-emerald-300">
                      Realtime ativo
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-emerald-400/15 bg-emerald-500/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Status do sistema
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <div>
                    <p className="font-bold text-emerald-100">
                      Monitoramento online
                    </p>
                    <p className="mt-1 text-sm text-emerald-200/70">
                      Última atualização às{" "}
                      {currentTime.toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
