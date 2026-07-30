"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TesteSupabasePage() {
  const [sessionInfo, setSessionInfo] = useState<{ hasSession: boolean; email?: string | null; userId?: string | null }>({ hasSession: false });
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSessionInfo({
          hasSession: Boolean(session),
          email: session?.user?.email ?? null,
          userId: session?.user?.id ?? null,
        });

        const { data, error: queryError } = await supabase.from('movimentacoes').select('*', { count: 'exact', head: true });
        if (queryError) {
          setError(JSON.stringify(queryError, null, 2));
        } else {
          setCount(data?.length ?? 0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.stack ?? err.message : String(err));
      }
    };

    load();
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Teste de conexão com Supabase</h1>
      <p>Sessão ativa: {sessionInfo.hasSession ? 'sim' : 'não'}</p>
      <p>E-mail: {sessionInfo.email ?? 'não autenticado'}</p>
      <p>ID do usuário: {sessionInfo.userId ?? 'não autenticado'}</p>
      <p>Quantidade de registros: {count ?? 'indisponível'}</p>
      {error ? (
        <>
          <p>Erro completo:</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        </>
      ) : (
        <p>Conexão com Supabase realizada</p>
      )}
    </main>
  );
}
