'use client';

import { CalendarClock, CalendarDays, Loader2, Stethoscope } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthenticatedUser } from '../../lib/api';

export default function AppointmentsPage() {
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
          <span className="eyebrow">Agenda</span>
          <h1>{user?.organizationName ?? user?.tenantName ?? 'Agenda'}</h1>
        </div>
        <a className="textButton" href="/">
          Voltar
        </a>
      </header>

      <section className="placeholderGrid">
        <article className="panel placeholderPanel">
          <CalendarDays size={24} />
          <h2>Calendário</h2>
          <p>Os horários, bloqueios e consultas serão organizados nesta tela.</p>
        </article>
        <article className="panel placeholderPanel">
          <Stethoscope size={24} />
          <h2>Profissionais</h2>
          <p>A disponibilidade por médico será conectada ao módulo de agenda.</p>
        </article>
        <article className="panel placeholderPanel">
          <CalendarClock size={24} />
          <h2>Regras de horário</h2>
          <p>Duração, intervalos e conflitos serão validados pelo backend.</p>
        </article>
      </section>
    </main>
  );
}

