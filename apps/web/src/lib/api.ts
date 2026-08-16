export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  organizationId: string | null;
  organizationName: string | null;
  role: MembershipRole;
  memberships: MembershipOption[];
}

export interface MembershipOption {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  organizationId: string | null;
  organizationName: string | null;
  role: MembershipRole;
}

export type MembershipRole = 'owner' | 'superadmin' | 'admin' | 'staff';

export interface TeamMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  tenantId: string;
  organizationId: string | null;
  role: MembershipRole;
  status: 'active' | 'inactive' | 'invited';
  createdAt: string;
  updatedAt: string;
}

export interface LoginSuccessResponse {
  requiresMembershipSelection: false;
  user: AuthenticatedUser;
}

export interface LoginMembershipSelectionResponse {
  requiresMembershipSelection: true;
  user: {
    email: string;
    name: string;
  };
  memberships: MembershipOption[];
}

export type LoginResponse = LoginSuccessResponse | LoginMembershipSelectionResponse;

export type MessagingConnectionStatus = 'not_configured' | 'disconnected' | 'qr_pending' | 'connected' | 'error';

export interface MessagingConnection {
  id: string;
  name: string;
  channel: 'whatsapp';
  provider: 'zapi';
  status: MessagingConnectionStatus;
  externalInstanceId: string | null;
  connectedPhone: string | null;
  credentialsConfigured: boolean;
  lastError: string | null;
  lastStatusAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function login(email: string, password: string, membershipId?: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, membershipId }),
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

export async function listTeamMembers(): Promise<{ members: TeamMember[] }> {
  return apiRequest<{ members: TeamMember[] }>('/api/team/members', {
    method: 'GET',
  });
}

export async function createTeamMember(input: {
  name: string;
  email: string;
  role: Exclude<MembershipRole, 'owner'>;
  password?: string;
}): Promise<{ member: TeamMember }> {
  return apiRequest<{ member: TeamMember }>('/api/team/members', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateTeamMember(
  membershipId: string,
  input: {
    name?: string;
    role?: Exclude<MembershipRole, 'owner'>;
    status?: 'active' | 'inactive';
    password?: string;
  },
): Promise<{ member: TeamMember }> {
  return apiRequest<{ member: TeamMember }>(`/api/team/members/${membershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getPrimaryWhatsappConnection(): Promise<{ connection: MessagingConnection | null }> {
  return apiRequest<{ connection: MessagingConnection | null }>('/api/messaging/connections/primary-whatsapp', {
    method: 'GET',
  });
}

export async function saveZApiConnection(input: {
  name: string;
  instanceId: string;
  token?: string;
  clientToken?: string;
}): Promise<{ connection: MessagingConnection }> {
  return apiRequest<{ connection: MessagingConnection }>('/api/messaging/connections/zapi', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function refreshMessagingConnectionStatus(
  connectionId: string,
): Promise<{ connection: MessagingConnection }> {
  return apiRequest<{ connection: MessagingConnection }>(`/api/messaging/connections/${connectionId}/status`, {
    method: 'POST',
  });
}

export async function getMessagingConnectionQrCode(connectionId: string): Promise<{ qrCode: string }> {
  return apiRequest<{ qrCode: string }>(`/api/messaging/connections/${connectionId}/qr-code`, {
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
