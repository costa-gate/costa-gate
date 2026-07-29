"use client";

import { useEffect, useState } from 'react';
import { counts } from '@/lib/movements';

export function DashboardStats() {
  const [stats, setStats] = useState({ ativos: 0, entradasHoje: 0, saidasHoje: 0, total: 0 });

  useEffect(() => {
    setStats(counts());
    const onStorage = () => setStats(counts());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
      {stats.ativos} veículos ativos · {stats.entradasHoje} entradas hoje · {stats.saidasHoje} saídas hoje · {stats.total} movimentações
    </div>
  );
}
