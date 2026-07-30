"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import {
  getActiveMovements,
  subscribeToMovements,
} from "@/lib/movements";
import type { VehicleMovement } from "@/types";

export default function DashboardGerencialPage() {
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
          : "Falha ao carregar o dashboard gerencial."
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
    Math.max(
      0,
      (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
    );

  const formatHoursMetric = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.floor((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const totalAtivos = data.length;
  const totalJav1 = data.filter((vehicle) => vehicle.unidade === "JAV 1").length;
  const totalJav2 = data.filter((vehicle) => vehicle.unidade === "JAV 2").length;
  const totalAcima24h = data.filter(
    (vehicle) => getHoursInside(vehicle.entrada) >= 24
  ).length;

  const tempoMedio =
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

  const totalNaPortaria = data.filter(
    (vehicle) => vehicle.status === "Na Portaria"
  ).length;

  const totalEmOperacao = data.filter(
    (vehicle) => vehicle.status === "Em Operação"
  ).length;

  const totalAguardandoSaida = data.filter(
    (vehicle) => vehicle.status === "Aguardando Saída"
  ).length;

  const totalNormais = data.filter(
    (vehicle) => getHoursInside(vehicle.entrada) < 2
  ).length;

  const totalAtencao = data.filter((vehicle) => {
    const hours = getHoursInside(vehicle.entrada);
    return hours >= 2 && hours < 6;
  }).length;

  const totalUrgentes = data.filter((vehicle) => {
    const hours = getHoursInside(vehicle.entrada);
    return hours >= 6 && hours < 24;
  }).length;

  const totalCriticos = data.filter(
    (vehicle) => getHoursInside(vehicle.entrada) >= 24
  ).length;

  const indiceOperacional =
    totalAtivos === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            100 -
              (totalCriticos * 30 +
                totalUrgentes * 15 +
                totalAtencao * 5) /
                totalAtivos
          )
        );

  const clientes = useMemo(() => {
    const counts = new Map<string, number>();

    data.forEach((vehicle) => {
      const key = vehicle.cliente?.trim() || "Sem cliente";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const operacoes = useMemo(() => {
    const counts = new Map<string, number>();

    data.forEach((vehicle) => {
      const key = vehicle.operacao?.trim() || "Sem operação";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const entradasPorHora = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}h`,
      value: 0,
    }));

    data.forEach((vehicle) => {
      const date = new Date(vehicle.entrada);
      const hour = date.getHours();

      if (hour >= 0 && hour <= 23) {
        hours[hour].value += 1;
      }
    });

    return hours.filter((item) => item.value > 0);
  }, [data]);

  const permanenciaPorCliente = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    data.forEach((vehicle) => {
      const client = vehicle.cliente?.trim() || "Sem cliente";
      const current = map.get(client) ?? { total: 0, count: 0 };

      map.set(client, {
        total: current.total + getHoursInside(vehicle.entrada),
        count: current.count + 1,
      });
    });

    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        average: values.count > 0 ? values.total / values.count : 0,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 8);
  }, [data, currentTime]);

  const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

  const tendenciaSeteDias = useMemo(() => {
    const today = startOfDay(currentTime);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const vehicles = data.filter((vehicle) => {
        const entryDate = new Date(vehicle.entrada);
        return entryDate >= date && entryDate < nextDate;
      });

      const averageHours =
        vehicles.length > 0
          ? vehicles.reduce(
              (total, vehicle) => total + getHoursInside(vehicle.entrada),
              0
            ) / vehicles.length
          : 0;

      return {
        date,
        label: date
          .toLocaleDateString("pt-BR", { weekday: "short" })
          .replace(".", "")
          .toUpperCase(),
        total: vehicles.length,
        averageHours,
      };
    });
  }, [data, currentTime]);

  const comparativoPeriodo = useMemo(() => {
    const todayStart = startOfDay(currentTime);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    const todayVehicles = data.filter((vehicle) => {
      const entryDate = new Date(vehicle.entrada);
      return entryDate >= todayStart && entryDate < tomorrowStart;
    });

    const yesterdayVehicles = data.filter((vehicle) => {
      const entryDate = new Date(vehicle.entrada);
      return entryDate >= yesterdayStart && entryDate < todayStart;
    });

    const average = (vehicles: VehicleMovement[]) =>
      vehicles.length > 0
        ? vehicles.reduce(
            (total, vehicle) => total + getHoursInside(vehicle.entrada),
            0
          ) / vehicles.length
        : 0;

    const volumeVariation =
      yesterdayVehicles.length > 0
        ? ((todayVehicles.length - yesterdayVehicles.length) /
            yesterdayVehicles.length) *
          100
        : todayVehicles.length > 0
          ? 100
          : 0;

    const todayAverage = average(todayVehicles);
    const yesterdayAverage = average(yesterdayVehicles);

    const averageVariation =
      yesterdayAverage > 0
        ? ((todayAverage - yesterdayAverage) / yesterdayAverage) * 100
        : todayAverage > 0
          ? 100
          : 0;

    return {
      todayCount: todayVehicles.length,
      yesterdayCount: yesterdayVehicles.length,
      volumeVariation,
      todayAverage,
      yesterdayAverage,
      averageVariation,
    };
  }, [data, currentTime]);

  const heatmapSemanal = useMemo(() => {
    const today = startOfDay(currentTime);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = data.filter((vehicle) => {
        const entryDate = new Date(vehicle.entrada);
        return entryDate >= date && entryDate < nextDate;
      }).length;

      return {
        label: date
          .toLocaleDateString("pt-BR", { weekday: "short" })
          .replace(".", "")
          .toUpperCase(),
        dateLabel: formatShortDate(date),
        count,
      };
    });
  }, [data, currentTime]);

  const prioridades = useMemo(
    () =>
      [...data]
        .sort(
          (a, b) =>
            new Date(a.entrada).getTime() -
            new Date(b.entrada).getTime()
        )
        .slice(0, 8),
    [data]
  );

  const maxCliente = Math.max(1, ...clientes.map((item) => item.value));
  const maxOperacao = Math.max(1, ...operacoes.map((item) => item.value));
  const maxEntradaHora = Math.max(
    1,
    ...entradasPorHora.map((item) => item.value)
  );
  const maxPermanenciaCliente = Math.max(
    1,
    ...permanenciaPorCliente.map((item) => item.average)
  );
  const maxTendenciaSeteDias = Math.max(
    1,
    ...tendenciaSeteDias.map((item) => item.total)
  );
  const maxHeatmapSemanal = Math.max(
    1,
    ...heatmapSemanal.map((item) => item.count)
  );

  const saudeOperacional = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          totalCriticos * 30 -
          totalUrgentes * 15 -
          totalAtencao * 5 -
          (tempoMedio > 6 ? 10 : 0)
      )
    )
  );

  const dentroSla = data.filter(
    (vehicle) => getHoursInside(vehicle.entrada) < 6
  ).length;

  const foraSla = Math.max(0, totalAtivos - dentroSla);

  const percentualSla =
    totalAtivos > 0 ? Math.round((dentroSla / totalAtivos) * 100) : 100;

  const gargalos = [
    {
      label: "Portaria",
      value: totalNaPortaria,
      severity:
        totalAtivos > 0 ? Math.round((totalNaPortaria / totalAtivos) * 100) : 0,
    },
    {
      label: "Operação",
      value: totalEmOperacao,
      severity:
        totalAtivos > 0 ? Math.round((totalEmOperacao / totalAtivos) * 100) : 0,
    },
    {
      label: "Aguardando saída",
      value: totalAguardandoSaida,
      severity:
        totalAtivos > 0
          ? Math.round((totalAguardandoSaida / totalAtivos) * 100)
          : 0,
    },
    {
      label: "Acima do SLA",
      value: foraSla,
      severity:
        totalAtivos > 0 ? Math.round((foraSla / totalAtivos) * 100) : 0,
    },
  ];

  const gargaloPrincipal = [...gargalos].sort(
    (a, b) => b.severity - a.severity
  )[0];

  const previsaoFimTurno = Math.max(
    totalAtivos,
    Math.round(
      totalAtivos +
        (comparativoPeriodo.todayCount > 0
          ? comparativoPeriodo.todayCount * 0.35
          : 0)
    )
  );

  const getHealthInfo = () => {
    if (saudeOperacional >= 90) {
      return {
        label: "NORMAL",
        description: "Operação dentro dos parâmetros atuais.",
        classes: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
        bar: "bg-emerald-500",
      };
    }

    if (saudeOperacional >= 70) {
      return {
        label: "ATENÇÃO",
        description: "Existem desvios que exigem acompanhamento preventivo.",
        classes: "border-amber-400/25 bg-amber-500/10 text-amber-200",
        bar: "bg-amber-400",
      };
    }

    return {
      label: "CRÍTICO",
      description: "Há risco operacional e necessidade de priorização imediata.",
      classes: "border-rose-400/25 bg-rose-500/10 text-rose-200",
      bar: "bg-rose-500",
    };
  };

  const getPriorityInfo = (vehicle: VehicleMovement) => {
    const hours = getHoursInside(vehicle.entrada);

    if (hours >= 24) {
      return {
        label: "Crítico",
        icon: "🔴",
        classes: "border-rose-400/30 bg-rose-500/10 text-rose-200",
      };
    }

    if (hours >= 6) {
      return {
        label: "Urgente",
        icon: "🟠",
        classes: "border-orange-400/30 bg-orange-500/10 text-orange-200",
      };
    }

    if (hours >= 2) {
      return {
        label: "Atenção",
        icon: "🟡",
        classes: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      };
    }

    return {
      label: "Normal",
      icon: "🟢",
      classes: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    };
  };

  const getIndiceClasses = () => {
    if (indiceOperacional >= 90) {
      return {
        text: "text-emerald-300",
        border: "border-emerald-400/20 bg-emerald-500/10",
        label: "Saudável",
      };
    }

    if (indiceOperacional >= 70) {
      return {
        text: "text-amber-300",
        border: "border-amber-400/20 bg-amber-500/10",
        label: "Atenção",
      };
    }

    return {
      text: "text-rose-300",
      border: "border-rose-400/20 bg-rose-500/10",
      label: "Crítico",
    };
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_24%),#020617]">
      <Sidebar />

      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-violet-400">
                  Gestão Executiva
                </p>
                <h1 className="mt-2 text-4xl font-black text-slate-50">
                  Dashboard Gerencial
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Visão consolidada da ocupação, criticidade e desempenho operacional
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Atualização em tempo real
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    {currentTime.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-3xl font-black tabular-nums text-violet-300">
                    {currentTime.toLocaleTimeString("pt-BR")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/veiculos-na-unidade"
                    className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-violet-400/40 hover:bg-slate-900"
                  >
                    Veículos
                  </Link>
                  <Link
                    href="/"
                    className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-violet-400/40 hover:bg-slate-900"
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

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            {[
              ["Veículos ativos", totalAtivos, "text-slate-50", "border-white/10 bg-slate-950/70"],
              ["JAV 1", totalJav1, "text-emerald-300", "border-emerald-400/20 bg-emerald-500/10"],
              ["JAV 2", totalJav2, "text-cyan-300", "border-cyan-400/20 bg-cyan-500/10"],
              ["Na portaria", totalNaPortaria, "text-emerald-300", "border-emerald-400/20 bg-emerald-500/10"],
              ["Em operação", totalEmOperacao, "text-amber-300", "border-amber-400/20 bg-amber-500/10"],
              ["Aguardando saída", totalAguardandoSaida, "text-orange-300", "border-orange-400/20 bg-orange-500/10"],
              ["Acima de 24h", totalAcima24h, "text-rose-300", "border-rose-400/20 bg-rose-500/10"],
              ["Tempo médio", formatHoursMetric(tempoMedio), "text-violet-300", "border-violet-400/20 bg-violet-500/10"],
            ].map(([label, value, textClass, cardClass]) => (
              <div
                key={String(label)}
                className={`rounded-3xl border p-5 ${cardClass}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {label}
                </p>
                <p className={`mt-3 text-3xl font-black ${textClass}`}>
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className={`rounded-[32px] border p-6 ${getHealthInfo().classes}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
                    Saúde da operação
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-6xl font-black tabular-nums">
                      {saudeOperacional}
                    </span>
                    <span className="pb-2 text-xl font-bold opacity-70">%</span>
                  </div>
                  <p className="mt-2 text-xl font-black">{getHealthInfo().label}</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 opacity-80">
                    {getHealthInfo().description}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/35 px-5 py-4 text-right">
                  <p className="text-xs uppercase tracking-wide opacity-65">
                    SLA atual
                  </p>
                  <p className="mt-2 text-4xl font-black">{percentualSla}%</p>
                  <p className="mt-1 text-xs opacity-70">Meta: 95%</p>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/20">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getHealthInfo().bar}`}
                  style={{ width: `${saudeOperacional}%` }}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <p className="text-xs opacity-65">Dentro do SLA</p>
                  <p className="mt-2 text-2xl font-black">{dentroSla}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <p className="text-xs opacity-65">Fora do SLA</p>
                  <p className="mt-2 text-2xl font-black">{foraSla}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <p className="text-xs opacity-65">Projeção fim do turno</p>
                  <p className="mt-2 text-2xl font-black">{previsaoFimTurno}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                Gargalos operacionais
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-50">
                Concentração por etapa
              </h2>

              <div className="mt-6 space-y-5">
                {gargalos.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-300">
                        {item.label}
                      </span>
                      <span className="text-sm font-black text-orange-300">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.severity >= 60
                            ? "bg-rose-500"
                            : item.severity >= 35
                              ? "bg-orange-500"
                              : item.severity > 0
                                ? "bg-amber-400"
                                : "bg-slate-700"
                        }`}
                        style={{ width: `${Math.max(item.severity, item.value > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Gargalo principal
                </p>
                <p className="mt-2 text-2xl font-black text-orange-300">
                  {gargaloPrincipal?.value > 0
                    ? gargaloPrincipal.label
                    : "Sem gargalo relevante"}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
            <div className={`rounded-[32px] border p-6 ${getIndiceClasses().border}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Índice operacional
              </p>

              <div className="mt-5 flex items-end gap-2">
                <span className={`text-6xl font-black tabular-nums ${getIndiceClasses().text}`}>
                  {indiceOperacional}
                </span>
                <span className="pb-2 text-xl font-bold text-slate-500">/100</span>
              </div>

              <p className={`mt-2 text-lg font-bold ${getIndiceClasses().text}`}>
                {getIndiceClasses().label}
              </p>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-950/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    indiceOperacional >= 90
                      ? "bg-emerald-500"
                      : indiceOperacional >= 70
                        ? "bg-amber-400"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${indiceOperacional}%` }}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs text-slate-500">Maior permanência</p>
                <p className="mt-2 text-2xl font-black text-slate-100">
                  {formatHoursMetric(maiorPermanencia)}
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Distribuição por criticidade
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["🟢 Normais", totalNormais, "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"],
                  ["🟡 Atenção", totalAtencao, "border-amber-400/20 bg-amber-500/10 text-amber-200"],
                  ["🟠 Urgentes", totalUrgentes, "border-orange-400/20 bg-orange-500/10 text-orange-200"],
                  ["🔴 Críticos", totalCriticos, "border-rose-400/20 bg-rose-500/10 text-rose-200"],
                ].map(([label, value, classes]) => (
                  <div
                    key={String(label)}
                    className={`rounded-2xl border p-5 ${classes}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                      {label}
                    </p>
                    <p className="mt-3 text-4xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                    Ranking
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-50">
                    Clientes com mais veículos
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                  Top 10
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {clientes.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                    Nenhum cliente com veículo ativo.
                  </div>
                ) : null}

                {clientes.map((item, index) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-7 text-sm font-black text-slate-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm font-bold text-slate-200">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-black text-cyan-300">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${(item.value / maxCliente) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                    Distribuição
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-50">
                    Operações ativas
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                  Top 10
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {operacoes.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                    Nenhuma operação ativa.
                  </div>
                ) : null}

                {operacoes.map((item, index) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-7 text-sm font-black text-slate-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm font-bold text-slate-200">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-black text-violet-300">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${(item.value / maxOperacao) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                    Tendência operacional
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-50">
                    Evolução dos últimos 7 dias
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                  Entradas ainda ativas
                </span>
              </div>

              <div className="mt-8 grid grid-cols-7 gap-2">
                {tendenciaSeteDias.map((item) => (
                  <div key={item.date.toISOString()} className="flex min-w-0 flex-col items-center">
                    <div className="mb-3 flex h-52 w-full items-end rounded-2xl bg-slate-950/55 p-2">
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-cyan-700 via-cyan-500 to-cyan-300 transition-all duration-500"
                        style={{
                          height: `${Math.max(
                            item.total > 0 ? 10 : 2,
                            (item.total / maxTendenciaSeteDias) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <span className="text-sm font-black text-cyan-300">
                      {item.total}
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-slate-400">
                      {item.label}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-600">
                      {formatShortDate(item.date)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Total no período
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-100">
                    {tendenciaSeteDias.reduce((total, item) => total + item.total, 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Melhor dia
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-300">
                    {
                      [...tendenciaSeteDias].sort(
                        (a, b) => b.total - a.total
                      )[0]?.label ?? "--"
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Média diária
                  </p>
                  <p className="mt-2 text-2xl font-black text-violet-300">
                    {(
                      tendenciaSeteDias.reduce(
                        (total, item) => total + item.total,
                        0
                      ) / 7
                    ).toFixed(1)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                A tendência considera os registros que permanecem ativos no banco atual. Quando o histórico completo de saídas estiver integrado, o gráfico passará a representar todo o movimento diário.
              </p>
            </div>

            <div className="space-y-5">
              <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                  Comparativo
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-50">
                  Hoje × Ontem
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Entradas ativas
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-100">
                          {comparativoPeriodo.todayCount}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Ontem: {comparativoPeriodo.yesterdayCount}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-black ${
                          comparativoPeriodo.volumeVariation <= 0
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-400/20 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {comparativoPeriodo.volumeVariation > 0 ? "+" : ""}
                        {comparativoPeriodo.volumeVariation.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Permanência média
                        </p>
                        <p className="mt-2 text-3xl font-black text-violet-300">
                          {formatHoursMetric(comparativoPeriodo.todayAverage)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Ontem: {formatHoursMetric(comparativoPeriodo.yesterdayAverage)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-black ${
                          comparativoPeriodo.averageVariation <= 0
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-400/20 bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        {comparativoPeriodo.averageVariation > 0 ? "+" : ""}
                        {comparativoPeriodo.averageVariation.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Heatmap semanal
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-50">
                  Intensidade por dia
                </h2>

                <div className="mt-6 space-y-3">
                  {heatmapSemanal.map((item) => {
                    const intensity = item.count / maxHeatmapSemanal;

                    return (
                      <div key={`${item.label}-${item.dateLabel}`} className="grid grid-cols-[54px_1fr_40px] items-center gap-3">
                        <div>
                          <p className="text-xs font-black text-slate-300">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            {item.dateLabel}
                          </p>
                        </div>

                        <div className="grid grid-cols-10 gap-1">
                          {Array.from({ length: 10 }, (_, index) => (
                            <div
                              key={index}
                              className={`h-5 rounded ${
                                index < Math.ceil(intensity * 10)
                                  ? intensity >= 0.75
                                    ? "bg-rose-500"
                                    : intensity >= 0.5
                                      ? "bg-orange-500"
                                      : intensity >= 0.25
                                        ? "bg-amber-400"
                                        : "bg-emerald-500"
                                  : "bg-slate-800"
                              }`}
                            />
                          ))}
                        </div>

                        <span className="text-right text-sm font-black text-slate-200">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    Evolução diária
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-50">
                    Entradas por hora
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                  Veículos ativos atuais
                </span>
              </div>

              {entradasPorHora.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                  Ainda não há entradas ativas para compor o gráfico.
                </div>
              ) : (
                <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto pb-2">
                  {entradasPorHora.map((item) => (
                    <div
                      key={item.hour}
                      className="flex min-w-[44px] flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="text-xs font-black text-emerald-300">
                        {item.value}
                      </span>
                      <div className="flex h-48 w-full items-end rounded-t-xl bg-slate-950/60 px-1">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-300 transition-all duration-500"
                          style={{
                            height: `${Math.max(
                              10,
                              (item.value / maxEntradaHora) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                O gráfico usa os horários de entrada dos veículos que permanecem ativos na unidade.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                    Permanência
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-50">
                    Tempo médio por cliente
                  </h2>
                </div>

                <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                  Top 8
                </span>
              </div>

              {permanenciaPorCliente.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                  Nenhum dado de permanência disponível.
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  {permanenciaPorCliente.map((item, index) => (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-7 text-sm font-black text-slate-500">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate text-sm font-bold text-slate-200">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-sm font-black text-amber-300">
                          {formatHoursMetric(item.average)}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                          style={{
                            width: `${Math.max(
                              4,
                              (item.average / maxPermanenciaCliente) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Ocupação
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-50">
                Distribuição JAV 1 × JAV 2
              </h2>

              <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                <div
                  className="relative h-52 w-52 rounded-full"
                  style={{
                    background:
                      totalAtivos > 0
                        ? `conic-gradient(#10b981 0 ${(totalJav1 / totalAtivos) * 100}%, #06b6d4 ${(totalJav1 / totalAtivos) * 100}% 100%)`
                        : "conic-gradient(#334155 0 100%)",
                  }}
                >
                  <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-slate-950">
                    <span className="text-4xl font-black text-white">
                      {totalAtivos}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ativos
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-xs space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/70">
                        JAV 1
                      </p>
                      <p className="mt-1 text-2xl font-black text-emerald-300">
                        {totalJav1}
                      </p>
                    </div>
                    <span className="text-lg font-black text-emerald-200">
                      {totalAtivos > 0
                        ? `${Math.round((totalJav1 / totalAtivos) * 100)}%`
                        : "0%"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                        JAV 2
                      </p>
                      <p className="mt-1 text-2xl font-black text-cyan-300">
                        {totalJav2}
                      </p>
                    </div>
                    <span className="text-lg font-black text-cyan-200">
                      {totalAtivos > 0
                        ? `${Math.round((totalJav2 / totalAtivos) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                Leitura executiva
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-50">
                Diagnóstico da operação
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unidade predominante
                  </p>
                  <p className="mt-3 text-2xl font-black text-slate-100">
                    {totalJav1 === totalJav2
                      ? "Equilibrado"
                      : totalJav1 > totalJav2
                        ? "JAV 1"
                        : "JAV 2"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nível de risco
                  </p>
                  <p
                    className={`mt-3 text-2xl font-black ${
                      totalCriticos > 0
                        ? "text-rose-300"
                        : totalUrgentes > 0
                          ? "text-orange-300"
                          : totalAtencao > 0
                            ? "text-amber-300"
                            : "text-emerald-300"
                    }`}
                  >
                    {totalCriticos > 0
                      ? "Crítico"
                      : totalUrgentes > 0
                        ? "Urgente"
                        : totalAtencao > 0
                          ? "Atenção"
                          : "Normal"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cliente predominante
                  </p>
                  <p className="mt-3 truncate text-2xl font-black text-cyan-300">
                    {clientes[0]?.name ?? "Sem dados"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Operação predominante
                  </p>
                  <p className="mt-3 truncate text-2xl font-black text-violet-300">
                    {operacoes[0]?.name ?? "Sem dados"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recomendação gerencial
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {totalCriticos > 0
                    ? "Há movimentos críticos. Priorize a retirada imediata e acione a liderança operacional."
                    : totalUrgentes > 0
                      ? "Existem movimentos urgentes. Recomenda-se acompanhar a conclusão das operações com maior permanência."
                      : totalAtencao > 0
                        ? "A operação exige atenção preventiva para evitar evolução de veículos para a faixa urgente."
                        : "A operação está dentro dos parâmetros atuais. Mantenha o acompanhamento em tempo real."}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[32px] border border-violet-400/15 bg-violet-500/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              Inteligência gerencial
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-50">
              Leitura automática da operação
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
                <p className="text-sm font-bold text-slate-100">
                  {totalJav1 === totalJav2
                    ? "Ocupação equilibrada entre as unidades."
                    : `${totalJav1 > totalJav2 ? "JAV 1" : "JAV 2"} concentra a maior ocupação.`}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
                <p className="text-sm font-bold text-slate-100">
                  {percentualSla >= 95
                    ? "Meta de SLA atendida."
                    : `SLA abaixo da meta em ${95 - percentualSla} ponto(s) percentual(is).`}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
                <p className="text-sm font-bold text-slate-100">
                  {clientes[0]
                    ? `${clientes[0].name} é o cliente com maior presença atual.`
                    : "Sem cliente predominante no momento."}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
                <p className="text-sm font-bold text-slate-100">
                  {totalCriticos > 0
                    ? "Existem movimentos críticos e ação imediata é necessária."
                    : totalUrgentes > 0
                      ? "Há movimentos urgentes exigindo acompanhamento."
                      : "Nenhum movimento crítico identificado."}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[32px] border border-white/10 bg-slate-900/55 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
                  Prioridades
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-50">
                  Veículos que exigem atenção
                </h2>
              </div>

              <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">
                Atualizado agora
              </span>
            </div>

            {isLoading ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                Carregando dados...
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {prioridades.map((vehicle) => {
                const priority = getPriorityInfo(vehicle);

                return (
                  <div
                    key={vehicle.id}
                    className={`rounded-3xl border p-5 ${priority.classes}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-wide">
                        {priority.icon} {priority.label}
                      </span>
                      <span className="text-xs font-semibold opacity-70">
                        {vehicle.unidade}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-black text-white">
                      {vehicle.placaCavalo}
                    </h3>
                    <p className="mt-1 truncate text-sm opacity-80">
                      {vehicle.cliente}
                    </p>
                    <p className="mt-4 text-lg font-black tabular-nums text-white">
                      {formatHoursMetric(getHoursInside(vehicle.entrada))}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
