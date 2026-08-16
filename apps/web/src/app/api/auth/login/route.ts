import { NextRequest, NextResponse } from 'next/server';
import { authCookieMaxAgeSeconds, authCookieName } from '../../../../lib/auth-cookie';
import { getApiBaseUrl, jsonError, readApiError } from '../../../../lib/server-api';

interface LoginResponse {
  requiresMembershipSelection?: boolean;
  accessToken?: string;
  user: unknown;
  memberships?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return jsonError('Informe email e senha.', 400);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Failed to call API auth login', error);

    return jsonError('Não foi possível conectar à API.', 502);
  }

  if (!response.ok) {
    const fallback =
      response.status === 400 ? 'Informe email e senha.'
      : response.status === 401 ? 'Credenciais inválidas.'
      : 'Não foi possível concluir a solicitação.';

    return jsonError(await readApiError(response, fallback), response.status);
  }

  const body = (await response.json()) as LoginResponse;

  if (body.requiresMembershipSelection) {
    return NextResponse.json({
      requiresMembershipSelection: true,
      user: body.user,
      memberships: body.memberships,
    });
  }

  if (!body.accessToken) {
    return jsonError('Não foi possível iniciar a sessão.', 502);
  }

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
