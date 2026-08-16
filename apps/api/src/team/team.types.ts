import type { MembershipRole } from '../auth/auth.types';

export type ManageableRole = Exclude<MembershipRole, 'owner'>;

export interface TeamMemberView {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  tenantId: string;
  organizationId: string | null;
  role: MembershipRole;
  status: 'active' | 'inactive' | 'invited';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  role: ManageableRole;
  password: string;
}

export interface UpdateTeamMemberInput {
  name?: string;
  role?: ManageableRole;
  status?: 'active' | 'inactive';
  password?: string;
}
