import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthUser } from './auth.types';
import { ROLES_KEY } from './roles.decorator';

// Runs after JwtAuthGuard (so request.user is set). Reads the @Roles metadata
// on the handler/class; allows the request only if the user's role is listed.
// A route with no @Roles is open to any authenticated user.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    return !!request.user && required.includes(request.user.role);
  }
}
