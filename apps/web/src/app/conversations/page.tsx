'use client';

import { Bot, Loader2, MessageCircle, UserRoundCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthenticatedUser } from '../../lib/api';

export default function ConversationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((result) => {
        setUser(result.user);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading) {
    return (
      <main className="loadingShell">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  return (
    <main className="settingsShell">
      <header className="settingsHeader">
        <div>
          <span className="eyebrow">Atendimento</span>
          <h1>{user?.organizationName ?? user?.tenantName ?? 'Conversas'}</h1>
        </div>
        <a className="textButton" href="/">
          Voltar
        </a>
      </header>

      <section className="placeholderGrid">
        <article className="panel placeholderPanel">
          <MessageCircle size={24} />
          <h2>Fila de conversas</h2>
          <p>As conversas recebidas pelos canais conectados serão listadas aqui.</p>
        </article>
        <article className="panel placeholderPanel">
          <Bot size={24} />
          <h2>Controle AI/Humano</h2>
          <p>Esta área vai concentrar quem está conduzindo cada atendimento.</p>
        </article>
        <article className="panel placeholderPanel">
          <UserRoundCheck size={24} />
          <h2>Assumir atendimento</h2>
          <p>As ações de assumir, pausar e devolver para IA entram no próximo bloco.</p>
        </article>
      </section>
    </main>
  );
}

