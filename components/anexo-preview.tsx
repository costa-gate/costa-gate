"use client";

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, ExternalLink, FileText, ImageIcon, Loader2, X } from 'lucide-react';

export type AnexoPreviewProps = {
  title: string;
  path: string | null | undefined;
  signedUrl: string | null;
  loading: boolean;
  error: boolean;
  onOpen?: () => void;
};

const isImagePath = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].some((ext) => normalized.endsWith(ext));
};

const isPdfPath = (value?: string | null) => {
  if (!value) return false;
  return value.toLowerCase().endsWith('.pdf');
};

const getDisplayName = (value?: string | null, fallback = 'Anexo') => {
  if (!value) return fallback;
  const parts = value.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? fallback;
};

const getFileType = (value?: string | null) => {
  if (!value) return 'Arquivo';
  if (isImagePath(value)) return 'Imagem';
  if (isPdfPath(value)) return 'PDF';
  return 'Arquivo';
};

const getFileExtension = (value?: string | null) => {
  if (!value) return 'arquivo';
  const match = value.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toUpperCase() ?? 'ARQUIVO';
};

export function AnexoPreview({ title, path, signedUrl, loading, error, onOpen }: AnexoPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const isImage = useMemo(() => isImagePath(path), [path]);
  const isPdf = useMemo(() => isPdfPath(path), [path]);
  const displayName = useMemo(() => getDisplayName(path, title), [path, title]);
  const fileType = useMemo(() => getFileType(path), [path]);
  const extension = useMemo(() => getFileExtension(path), [path]);

  useEffect(() => {
    if (!isExpanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  useEffect(() => {
    setHasImageError(false);
  }, [signedUrl]);

  const renderEmptyState = (message: string, icon?: ReactNode) => (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
      <p className="text-sm text-slate-400">{title}</p>
      <div className="mt-3 flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-slate-900/70 px-3 py-4 text-sm text-slate-400">
        {icon}
        <span>{message}</span>
      </div>
    </div>
  );

  if (!path) {
    return renderEmptyState('Nenhum arquivo enviado', <ImageIcon className="h-6 w-6 text-slate-500" />);
  }

  if (loading) {
    return renderEmptyState('Carregando anexo...', <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />);
  }

  if (error || !signedUrl) {
    return renderEmptyState('Não foi possível carregar o arquivo', <FileText className="h-6 w-6 text-slate-500" />);
  }

  if (isPdf) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
        <p className="text-sm text-slate-400">{title}</p>
        <div className="mt-3 flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <FileText className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="max-w-[220px] truncate text-sm font-medium text-slate-100">{displayName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{fileType} · {extension}</p>
          </div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir documento
          </a>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
          <p className="text-sm text-slate-400">{title}</p>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              onOpen?.();
            }}
            className="group mt-3 block w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 p-1 text-left shadow-sm transition hover:border-emerald-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            aria-label={`Ampliar ${displayName}`}
          >
            <div className="relative aspect-[260/180] w-full overflow-hidden rounded-lg bg-slate-950/60 sm:aspect-[260/180] sm:min-h-[180px]">
              {hasImageError ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  Não foi possível exibir a imagem.
                </div>
              ) : (
                <img
                  src={signedUrl}
                  alt={title}
                  className="h-full w-full rounded-lg object-cover"
                  loading="lazy"
                  onError={() => setHasImageError(true)}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 sm:opacity-100 sm:group-hover:opacity-100">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-medium text-slate-100 shadow-lg">
                  <Eye className="h-4 w-4" />
                  Ampliar
                </div>
              </div>
              <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200 sm:hidden">
                Toque para ampliar
              </div>
            </div>
          </button>
          <div className="mt-3 text-left">
            <p className="truncate text-sm font-medium text-slate-100">{displayName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{fileType} · {extension}</p>
          </div>
        </div>

        {isExpanded ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3"
            role="dialog"
            aria-modal="true"
            onClick={() => setIsExpanded(false)}
          >
            <div className="relative flex w-full max-w-5xl flex-col rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">{title}</p>
                  <p className="mt-1 text-sm text-slate-300">{displayName}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir em nova aba
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200"
                  >
                    <X className="h-4 w-4" />
                    Fechar
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center rounded-xl bg-slate-950/60 p-2">
                <img src={signedUrl} alt={title} className="max-h-[75vh] w-full rounded-xl object-contain" />
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return renderEmptyState('Não foi possível carregar o arquivo', <FileText className="h-6 w-6 text-slate-500" />);
}
