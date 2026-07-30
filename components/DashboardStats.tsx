"use client";

import { useEffect, useState } from 'react';
import { getMovementStats, subscribeToMovements } from '@/lib/movements';

export function DashboardStats() {
  const [stats, setStats] = useState({ ativos: 0, entradasHoje: 0, saidasHoje: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const nextStats = await getMovementStats();
        setStats(nextStats);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
    const unsubscribe = subscribeToMovements(() => {
      loadStats();
    });
    return unsubscribe;
  }, []);

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
      {isLoading ? 'Carregando indicadores...' : `${stats.ativos} veículos ativos · ${stats.entradasHoje} entradas hoje · ${stats.saidasHoje} saídas hoje · ${stats.total} movimentações`}
    </div>
  );
}
