export type MembershipRole = 'owner' | 'superadmin' | 'admin' | 'staff';

export interface MembershipOption {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  organizationId: string | null;
  organizationName: string | null;
  role: MembershipRole;
}

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

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  organizationId: string | null;
  organizationName: string | null;
  role: MembershipRole;
}
