import { ArrowRight, Clock3 } from 'lucide-react';
import type { VehicleMovement } from '@/types';
import { formatDateTimePtBR, formatDurationMinutes } from '@/lib/dashboard';

type OperationalAlertProps = {
  movement: VehicleMovement;
  onOpen: (movement: VehicleMovement) => void;
  threshold: 24 | 48;
};

export function OperationalAlert({ movement, onOpen, threshold }: OperationalAlertProps) {
  const duration = movement.entrada ? formatDurationMinutes(Math.max(0, Math.floor((Date.now() - new Date(movement.entrada).getTime()) / 60000))) : '—';

  return (
    <button
      type="button"
      onClick={() => onOpen(movement)}
      className="w-full rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-left transition hover:border-amber-300/40 hover:bg-amber-500/15"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Clock3 className="h-4 w-4" />
            {threshold === 24 ? 'Acima de 24 horas' : 'Acima de 48 horas'}
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-50">{movement.placaCavalo || movement.placaCarreta || 'Sem placa'}</div>
          <p className="mt-1 text-sm text-slate-300">{movement.cliente || 'Sem cliente'} · {movement.unidade || 'Sem unidade'}</p>
        </div>
        <div className="text-right text-sm text-slate-400">
          <p>{duration}</p>
          <p className="mt-1 flex items-center gap-1 text-emerald-300">
            Detalhes <ArrowRight className="h-4 w-4" />
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
        <span>Entrada: {formatDateTimePtBR(movement.entrada)}</span>
      </div>
    </button>
  );
}
