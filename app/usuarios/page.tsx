"use client";

import { Sidebar } from '@/components/Sidebar';

export default function UsuariosPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.15),_transparent_24%),#020617]">
      <Sidebar />
      <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-slate-900/60 p-8 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Usuários</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">Gestão de usuários</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">A área de usuários ficará disponível para integração futura com o Supabase Auth e perfis de acesso.</p>
        </div>
      </main>
    </div>
  );
}
