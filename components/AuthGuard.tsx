"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const publicRoutes = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user && !publicRoutes.includes(pathname)) {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  if (loading && !publicRoutes.includes(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p>Validando sessão...</p>
      </div>
    );
  }

  return <>{children}</>
}
