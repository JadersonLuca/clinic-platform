import { memberships, organizations, tenants, users } from '@clinic/database';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { AuthenticatedUser, JwtPayload } from './auth.types';
import { PasswordService } from './password.service';

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const emailNormalized = normalizeEmail(email);
    const [row] = await this.databaseService.db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        tenantId: memberships.tenantId,
        membershipId: memberships.id,
        organizationId: memberships.organizationId,
        role: memberships.role,
      })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .leftJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(
        and(
          eq(users.emailNormalized, emailNormalized),
          eq(users.status, 'active'),
          eq(memberships.status, 'active'),
          eq(tenants.status, 'active'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verify(password, row.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user: AuthenticatedUser = {
      userId: row.userId,
      email: row.email,
      name: row.name,
      tenantId: row.tenantId,
      membershipId: row.membershipId,
      organizationId: row.organizationId,
      role: row.role,
    };

    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      user,
    };
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
      membershipId: user.membershipId,
      organizationId: user.organizationId,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    });
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
