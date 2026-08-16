import { NextRequest, NextResponse } from 'next/server';
import { authCookieName } from '../../../../lib/auth-cookie';
import { getApiBaseUrl, jsonError, readApiError } from '../../../../lib/server-api';

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyTeamRequest(request, context, 'GET');
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyTeamRequest(request, context, 'POST');
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyTeamRequest(request, context, 'PATCH');
}

async function proxyTeamRequest(
  request: NextRequest,
  context: RouteContext,
  method: 'GET' | 'POST' | 'PATCH',
): Promise<NextResponse> {
  const accessToken = request.cookies.get(authCookieName)?.value;

  if (!accessToken) {
    return jsonError('Sessão expirada.', 401);
  }

  const { path } = await context.params;
  const body = method === 'GET' ? undefined : await request.text();

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/team/${path.join('/')}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Failed to call API team route', error);

    return jsonError('Não foi possível conectar à API.', 502);
  }

  if (!response.ok) {
    return jsonError(await readApiError(response, 'Não foi possível concluir a solicitação.'), response.status);
  }

  return NextResponse.json(await response.json());
}
