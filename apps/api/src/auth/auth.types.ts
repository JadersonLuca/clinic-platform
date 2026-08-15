export type MembershipRole = 'owner' | 'admin' | 'staff';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  membershipId: string;
  organizationId: string | null;
  role: MembershipRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  membershipId: string;
  organizationId: string | null;
  role: MembershipRole;
}
