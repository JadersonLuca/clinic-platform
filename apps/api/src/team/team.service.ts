import { memberships, users } from '@clinic/database';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AuthenticatedUser, MembershipRole } from '../auth/auth.types';
import { normalizeEmail } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import { DatabaseService } from '../database/database.service';
import type { CreateTeamMemberInput, ManageableRole, TeamMemberView, UpdateTeamMemberInput } from './team.types';

@Injectable()
export class TeamService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  async listMembers(currentUser: AuthenticatedUser): Promise<{ members: TeamMemberView[] }> {
    this.assertCanManageTeam(currentUser);

    const rows = await this.databaseService.db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        tenantId: memberships.tenantId,
        organizationId: memberships.organizationId,
        role: memberships.role,
        status: memberships.status,
        createdAt: memberships.createdAt,
        updatedAt: memberships.updatedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(this.companyWhere(currentUser))
      .orderBy(asc(users.name), asc(users.email));

    return { members: rows };
  }

  async createMember(
    currentUser: AuthenticatedUser,
    input: CreateTeamMemberInput,
  ): Promise<{ member: TeamMemberView }> {
    this.assertCanAssignRole(currentUser, input.role);

    const emailNormalized = normalizeEmail(input.email);
    const passwordHash = await this.passwordService.hash(input.password);

    const member = await this.databaseService.db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);

      const [user] =
        existingUser ?
          await tx
            .update(users)
            .set({
              name: input.name,
              email: input.email,
              passwordHash,
              status: 'active',
            })
            .where(eq(users.id, existingUser.id))
            .returning()
        : await tx
            .insert(users)
            .values({
              name: input.name,
              email: input.email,
              emailNormalized,
              passwordHash,
              status: 'active',
            })
            .returning();

      const [existingMembership] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.tenantId, currentUser.tenantId),
            currentUser.organizationId ?
              eq(memberships.organizationId, currentUser.organizationId)
            : isNull(memberships.organizationId),
            eq(memberships.userId, user.id),
          ),
        )
        .limit(1);

      if (existingMembership) {
        throw new ConflictException('User already belongs to this company');
      }

      const [membership] = await tx
        .insert(memberships)
        .values({
          tenantId: currentUser.tenantId,
          organizationId: currentUser.organizationId,
          userId: user.id,
          role: input.role,
          status: 'active',
        })
        .returning();

      return this.toView(user, membership);
    });

    return { member };
  }

  async updateMember(
    currentUser: AuthenticatedUser,
    membershipId: string,
    input: UpdateTeamMemberInput,
  ): Promise<{ member: TeamMemberView }> {
    this.assertCanManageTeam(currentUser);

    const existing = await this.findCompanyMembership(membershipId, currentUser);

    if (existing.userId === currentUser.userId && (input.role || input.status === 'inactive')) {
      throw new BadRequestException('You cannot change your own role or disable your own access');
    }

    if (!this.canManageRole(currentUser.role, existing.role)) {
      throw new ForbiddenException('You cannot manage this user');
    }

    if (input.role) {
      this.assertCanAssignRole(currentUser, input.role);
    }

    const passwordHash = input.password ? await this.passwordService.hash(input.password) : undefined;

    const [member] = await this.databaseService.db.transaction(async (tx) => {
      const [user] =
        input.name || passwordHash ?
          await tx
            .update(users)
            .set({
              ...(input.name ? { name: input.name } : {}),
              ...(passwordHash ? { passwordHash } : {}),
            })
            .where(eq(users.id, existing.userId))
            .returning()
        : await tx.select().from(users).where(eq(users.id, existing.userId)).limit(1);

      const [membership] = await tx
        .update(memberships)
        .set({
          ...(input.role ? { role: input.role } : {}),
          ...(input.status ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, existing.membershipId))
        .returning();

      return [this.toView(user, membership)];
    });

    return { member };
  }

  private async findCompanyMembership(membershipId: string, currentUser: AuthenticatedUser): Promise<TeamMemberView> {
    const [row] = await this.databaseService.db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        tenantId: memberships.tenantId,
        organizationId: memberships.organizationId,
        role: memberships.role,
        status: memberships.status,
        createdAt: memberships.createdAt,
        updatedAt: memberships.updatedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(this.companyWhere(currentUser), eq(memberships.id, membershipId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Team member not found');
    }

    return row;
  }

  private companyWhere(currentUser: AuthenticatedUser) {
    return and(
      eq(memberships.tenantId, currentUser.tenantId),
      currentUser.organizationId ?
        eq(memberships.organizationId, currentUser.organizationId)
      : isNull(memberships.organizationId),
    );
  }

  private toView(user: typeof users.$inferSelect, membership: typeof memberships.$inferSelect): TeamMemberView {
    return {
      membershipId: membership.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      tenantId: membership.tenantId,
      organizationId: membership.organizationId,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  private assertCanManageTeam(currentUser: AuthenticatedUser): void {
    if (!['owner', 'superadmin', 'admin'].includes(currentUser.role)) {
      throw new ForbiddenException('You cannot manage team users');
    }
  }

  private assertCanAssignRole(currentUser: AuthenticatedUser, role: ManageableRole): void {
    this.assertCanManageTeam(currentUser);

    if (!this.canManageRole(currentUser.role, role)) {
      throw new ForbiddenException('You cannot assign this role');
    }
  }

  private canManageRole(actorRole: MembershipRole, targetRole: MembershipRole): boolean {
    if (actorRole === 'owner') {
      return targetRole !== 'owner';
    }

    if (actorRole === 'superadmin') {
      return targetRole !== 'owner';
    }

    if (actorRole === 'admin') {
      return targetRole === 'staff';
    }

    return false;
  }
}
