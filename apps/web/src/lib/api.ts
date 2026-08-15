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
  accessToken: string;
  user: AuthenticatedUser;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser(accessToken: string): Promise<{ user: AuthenticatedUser }> {
  return apiRequest<{ user: AuthenticatedUser }>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const fallback = response.status === 401 ? 'Credenciais inválidas.' : 'Não foi possível concluir a solicitação.';
    throw new ApiError(fallback, response.status);
  }

  return response.json() as Promise<T>;
}
