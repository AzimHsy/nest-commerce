import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Spring analogy: like @PreAuthorize("hasRole('ADMIN')"). Attaches the allowed
// roles as route metadata; RolesGuard reads it. Usage: @Roles(Role.ADMIN)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
