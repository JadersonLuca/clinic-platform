import { NextRequest, NextResponse } from 'next/server';
import { authCookieName } from '../../../../lib/auth-cookie';
import { getApiBaseUrl, jsonError, readApiError } from '../../../../lib/server-api';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(authCookieName)?.value;

  if (!accessToken) {
    return jsonError('Sessão expirada.', 401);
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const fallback = response.status === 401 ? 'Sessão expirada.' : 'Não foi possível validar a sessão.';
    const nextResponse = jsonError(await readApiError(response, fallback), response.status);

    nextResponse.cookies.delete(authCookieName);

    return nextResponse;
  }

  return NextResponse.json(await response.json());
}
