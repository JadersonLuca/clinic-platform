import { NextResponse } from 'next/server';

export function getApiBaseUrl(): string {
  const apiBaseUrl =
    process.env.API_INTERNAL_BASE_URL ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('API_INTERNAL_BASE_URL or NEXT_PUBLIC_API_BASE_URL must be configured');
  }

  return apiBaseUrl.replace(/\/$/, '');
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function jsonError(message: string, status: number): NextResponse<{ message: string }> {
  return NextResponse.json({ message }, { status });
}
