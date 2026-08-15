import { NextRequest, NextResponse } from 'next/server';
import { authCookieMaxAgeSeconds, authCookieName } from '../../../../lib/auth-cookie';
import { getApiBaseUrl, jsonError, readApiError } from '../../../../lib/server-api';

interface LoginResponse {
  accessToken: string;
  user: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return jsonError('Informe email e senha.', 400);
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    cache: 'no-store',
  });

  if (!response.ok) {
    const fallback =
      response.status === 400 ? 'Informe email e senha.'
      : response.status === 401 ? 'Credenciais inválidas.'
      : 'Não foi possível concluir a solicitação.';

    return jsonError(await readApiError(response, fallback), response.status);
  }

  const body = (await response.json()) as LoginResponse;
  const nextResponse = NextResponse.json({ user: body.user });

  nextResponse.cookies.set({
    name: authCookieName,
    value: body.accessToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: authCookieMaxAgeSeconds,
  });

  return nextResponse;
}
