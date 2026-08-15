export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  membershipId: string;
  organizationId: string | null;
  role: 'owner' | 'admin' | 'staff';
}

export interface LoginResponse {
  user: AuthenticatedUser;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser(): Promise<{ user: AuthenticatedUser }> {
  return apiRequest<{ user: AuthenticatedUser }>('/api/auth/me', {
    method: 'GET',
  });
}

export async function logout(): Promise<void> {
  await apiRequest<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  });
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const fallback =
      response.status === 400 ? 'Informe email e senha.'
      : response.status === 401 ? 'Credenciais inválidas.'
      : 'Não foi possível concluir a solicitação.';

    throw new ApiError(await readErrorMessage(response, fallback), response.status);
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
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
