import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser, MembershipRole } from '../auth/auth.types';
import { TeamService } from './team.service';
import type { CreateTeamMemberInput, ManageableRole, UpdateTeamMemberInput } from './team.types';

interface CreateTeamMemberBody {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  password?: unknown;
}

interface UpdateTeamMemberBody {
  name?: unknown;
  role?: unknown;
  status?: unknown;
  password?: unknown;
}

const manageableRoles: ManageableRole[] = ['superadmin', 'admin', 'staff'];

@Controller('team')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('members')
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.teamService.listMembers(user);
  }

  @Post('members')
  createMember(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTeamMemberBody) {
    const input = parseCreateBody(body);

    return this.teamService.createMember(user, input);
  }

  @Patch('members/:membershipId')
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() body: UpdateTeamMemberBody,
  ) {
    const input = parseUpdateBody(body);

    return this.teamService.updateMember(user, membershipId, input);
  }
}

function parseCreateBody(body: CreateTeamMemberBody): CreateTeamMemberInput {
  const name = readRequiredString(body.name, 'name');
  const email = readRequiredString(body.email, 'email');
  const password = readOptionalString(body.password) ?? '123456';
  const role = readRole(body.role);

  if (!email.includes('@')) {
    throw new BadRequestException('email must be valid');
  }

  if (password.length < 6) {
    throw new BadRequestException('password must have at least 6 characters');
  }

  return { name, email, password, role };
}

function parseUpdateBody(body: UpdateTeamMemberBody): UpdateTeamMemberInput {
  const input: UpdateTeamMemberInput = {};

  if (body.name !== undefined) {
    input.name = readRequiredString(body.name, 'name');
  }

  if (body.role !== undefined) {
    input.role = readRole(body.role);
  }

  if (body.status !== undefined) {
    if (body.status !== 'active' && body.status !== 'inactive') {
      throw new BadRequestException('status must be active or inactive');
    }

    input.status = body.status;
  }

  if (body.password !== undefined) {
    input.password = readRequiredString(body.password, 'password');

    if (input.password.length < 6) {
      throw new BadRequestException('password must have at least 6 characters');
    }
  }

  return input;
}

function readRole(value: unknown): ManageableRole {
  if (!manageableRoles.includes(value as MembershipRole as ManageableRole)) {
    throw new BadRequestException('role must be superadmin, admin or staff');
  }

  return value as ManageableRole;
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${field} is required`);
  }

  return value.trim();
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
