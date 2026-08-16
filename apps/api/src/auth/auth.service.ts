import { memberships, organizations, tenants, users } from '@clinic/database';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser, JwtPayload, MembershipOption } from './auth.types';
import { PasswordService } from './password.service';

export interface LoginSuccessResult {
  requiresMembershipSelection: false;
  accessToken: string;
  user: AuthenticatedUser;
}

export interface LoginMembershipSelectionResult {
  requiresMembershipSelection: true;
  user: {
    email: string;
    name: string;
  };
  memberships: MembershipOption[];
}

export type LoginResult = LoginSuccessResult | LoginMembershipSelectionResult;

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(email: string, password: string, membershipId?: string): Promise<LoginResult> {
    const emailNormalized = normalizeEmail(email);
    const [account] = await this.databaseService.db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(and(eq(users.emailNormalized, emailNormalized), eq(users.status, 'active')))
      .limit(1);

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verify(password, account.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userMemberships = await this.getActiveMemberships(account.userId);

    if (userMemberships.length === 0) {
      throw new UnauthorizedException('No active company access');
    }

    if (!membershipId && userMemberships.length > 1) {
      return {
        requiresMembershipSelection: true,
        user: {
          email: account.email,
          name: account.name,
        },
        memberships: userMemberships,
      };
    }

    const selectedMembership =
      userMemberships.find((membership) => membership.membershipId === membershipId) ?? userMemberships[0];

    if (membershipId && selectedMembership.membershipId !== membershipId) {
      throw new UnauthorizedException('Invalid company access');
    }

    const user: AuthenticatedUser = {
      userId: account.userId,
      email: account.email,
      name: account.name,
      tenantId: selectedMembership.tenantId,
      tenantName: selectedMembership.tenantName,
      membershipId: selectedMembership.membershipId,
      organizationId: selectedMembership.organizationId,
      organizationName: selectedMembership.organizationName,
      role: selectedMembership.role,
      memberships: userMemberships,
    };

    const accessToken = await this.signAccessToken(user);

    return {
      requiresMembershipSelection: false,
      accessToken,
      user,
    };
  }

  async getSessionUser(currentUser: AuthenticatedUser): Promise<AuthenticatedUser> {
    const userMemberships = await this.getActiveMemberships(currentUser.userId);
    const selectedMembership = userMemberships.find(
      (membership) => membership.membershipId === currentUser.membershipId,
    );

    if (!selectedMembership) {
      throw new UnauthorizedException('Session company access is no longer active');
    }

    return {
      ...currentUser,
      tenantId: selectedMembership.tenantId,
      tenantName: selectedMembership.tenantName,
      organizationId: selectedMembership.organizationId,
      organizationName: selectedMembership.organizationName,
      role: selectedMembership.role,
      memberships: userMemberships,
    };
  }

  private async getActiveMemberships(userId: string): Promise<MembershipOption[]> {
    return this.databaseService.db
      .select({
        membershipId: memberships.id,
        tenantId: memberships.tenantId,
        tenantName: tenants.name,
        organizationId: memberships.organizationId,
        organizationName: organizations.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .leftJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.status, 'active'),
          eq(tenants.status, 'active'),
        ),
      )
      .orderBy(asc(tenants.name), asc(organizations.name));
  }

  private async signAccessToken(user: AuthenticatedUser): Promise<string> {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      membershipId: user.membershipId,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      role: user.role,
    };

    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '8h') as JwtSignOptions['expiresIn'];

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn,
    });
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
