'use client';

import { ContactRound, FileClock, Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthenticatedUser } from '../../lib/api';

export default function PatientsPage() {
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
          <span className="eyebrow">Pacientes</span>
          <h1>{user?.organizationName ?? user?.tenantName ?? 'Pacientes'}</h1>
        </div>
        <a className="textButton" href="/">
          Voltar
        </a>
      </header>

      <section className="placeholderGrid">
        <article className="panel placeholderPanel">
          <Users size={24} />
          <h2>Cadastro</h2>
          <p>Os pacientes e seus dados principais serão gerenciados aqui.</p>
        </article>
        <article className="panel placeholderPanel">
          <ContactRound size={24} />
          <h2>Contatos</h2>
          <p>Telefones e canais serão unificados sem duplicar pacientes.</p>
        </article>
        <article className="panel placeholderPanel">
          <FileClock size={24} />
          <h2>Histórico</h2>
          <p>Conversas, consultas e documentos aparecerão como linha do tempo.</p>
        </article>
      </section>
    </main>
  );
}

