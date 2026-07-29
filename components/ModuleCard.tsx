import Link from 'next/link';
import type { ReactNode } from 'react';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
}

export function ModuleCard({ title, description, icon, href }: ModuleCardProps) {
  const card = (
    <article className="group rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-500/50">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl text-emerald-400">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
