'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse, Loader2, LogIn } from 'lucide-react';
import { ApiError, getCurrentUser, login } from '../../lib/api';
import { clearSession, readAccessToken, writeSession } from '../../lib/auth-storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const accessToken = readAccessToken();

    if (!accessToken) {
      setIsCheckingSession(false);
      return;
    }

    getCurrentUser(accessToken)
      .then(() => {
        router.replace('/');
      })
      .catch(() => {
        clearSession();
        setIsCheckingSession(false);
      });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      writeSession(result.accessToken, result.user);
      router.replace('/');
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

          <button className="primaryButton" disabled={isSubmitting || !email || !password} type="submit">
            {isSubmitting ?
              <Loader2 className="spin" size={18} />
            : <LogIn size={18} />}
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
