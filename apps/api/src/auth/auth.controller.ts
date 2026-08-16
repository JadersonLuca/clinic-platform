import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService, type LoginResult } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './auth.types';

interface LoginBody {
  email?: unknown;
  password?: unknown;
  membershipId?: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody): Promise<LoginResult> {
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      throw new BadRequestException('email and password are required');
    }

    if (body.membershipId !== undefined && typeof body.membershipId !== 'string') {
      throw new BadRequestException('membershipId must be a string');
    }

    return this.authService.login(body.email, body.password, body.membershipId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<{ user: AuthenticatedUser }> {
    return { user: await this.authService.getSessionUser(user) };
  }
}
