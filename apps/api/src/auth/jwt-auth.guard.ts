import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser, JwtPayload } from './auth.types';

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authorization = request.headers.authorization;
    const token = this.extractBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });

    request.user = {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      tenantId: payload.tenantId,
      membershipId: payload.membershipId,
      organizationId: payload.organizationId,
      role: payload.role,
    };

    return true;
  }

  private extractBearerToken(authorization: string | string[] | undefined): string | null {
    const value = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!value) {
      return null;
    }

    const [scheme, token] = value.split(' ');

    return scheme === 'Bearer' && token ? token : null;
  }
}
