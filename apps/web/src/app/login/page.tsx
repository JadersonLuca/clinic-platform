'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, HeartPulse, Loader2, LogIn } from 'lucide-react';
import { ApiError, getCurrentUser, login, type MembershipOption } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [membershipOptions, setMembershipOptions] = useState<MembershipOption[]>([]);
  const [nextPath, setNextPath] = useState('/');

  useEffect(() => {
    setNextPath(readSafeNextPath());

    getCurrentUser()
      .then(() => {
        router.replace(readSafeNextPath());
      })
      .catch(() => {
        setIsCheckingSession(false);
      });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setMembershipOptions([]);

    try {
      const result = await login(email, password);

      if (result.requiresMembershipSelection) {
        setMembershipOptions(result.memberships);
        return;
      }

      router.replace(nextPath);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError('Não foi possível conectar à API.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectMembership(membershipId: string) {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password, membershipId);

      if (result.requiresMembershipSelection) {
        setMembershipOptions(result.memberships);
        return;
      }

      router.replace(nextPath);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError('Não foi possível conectar à API.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="loadingShell">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  return (
    <main className="authShell">
      <section className="authPanel" aria-labelledby="login-title">
        <div className="authBrand">
          <div className="brandMark">
            <HeartPulse size={22} />
          </div>
          <div>
            <strong>Clinic Platform</strong>
            <span>Acesso administrativo</span>
          </div>
        </div>

        <form className="authForm" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Entrar</span>
            <h1 id="login-title">Acesse o painel</h1>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ?
            <p className="formError" role="alert">
              {error}
            </p>
          : null}

          {membershipOptions.length > 0 ?
            <div className="companyPicker" aria-label="Escolher empresa">
              {membershipOptions.map((membership) => (
                <button
                  className="companyOption"
                  disabled={isSubmitting}
                  key={membership.membershipId}
                  onClick={() => void handleSelectMembership(membership.membershipId)}
                  type="button"
                >
                  <Building2 size={18} />
                  <span>
                    <strong>{membership.organizationName ?? membership.tenantName}</strong>
                    <small>
                      {membership.tenantName} · {membership.role}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          : <button className="primaryButton" disabled={isSubmitting || !email || !password} type="submit">
              {isSubmitting ?
                <Loader2 className="spin" size={18} />
              : <LogIn size={18} />}
              Entrar
            </button>}
        </form>
      </section>
    </main>
  );
}

function readSafeNextPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  const next = new URLSearchParams(window.location.search).get('next');

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }

  return next;
}
