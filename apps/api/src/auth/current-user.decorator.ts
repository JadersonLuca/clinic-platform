import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.types';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new Error('Authenticated user not found in request context');
    }

    return request.user;
  },
);
