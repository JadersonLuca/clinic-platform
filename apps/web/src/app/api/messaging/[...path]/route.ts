import { NextRequest, NextResponse } from 'next/server';
import { authCookieName } from '../../../../lib/auth-cookie';
import { getApiBaseUrl, jsonError, readApiError } from '../../../../lib/server-api';

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyMessagingRequest(request, context, 'GET');
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyMessagingRequest(request, context, 'POST');
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyMessagingRequest(request, context, 'DELETE');
}

async function proxyMessagingRequest(
  request: NextRequest,
  context: RouteContext,
  method: 'DELETE' | 'GET' | 'POST',
): Promise<NextResponse> {
  const accessToken = request.cookies.get(authCookieName)?.value;

  if (!accessToken) {
    return jsonError('Sessão expirada.', 401);
  }

  const { path } = await context.params;
  const body = method === 'POST' ? await request.text() : undefined;

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/messaging/${path.join('/')}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Failed to call API messaging route', error);

    return jsonError('Não foi possível conectar à API.', 502);
  }

  if (!response.ok) {
    return jsonError(await readApiError(response, 'Não foi possível concluir a solicitação.'), response.status);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return NextResponse.json(await response.json());
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      ...(response.headers.get('content-length') ? { 'Content-Length': response.headers.get('content-length') as string } : {}),
      ...(response.headers.get('cache-control') ? { 'Cache-Control': response.headers.get('cache-control') as string } : {}),
    },
  });
}
