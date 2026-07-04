import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { AuthUser } from './auth.types';
import { ROLES_KEY } from './roles.decorator';

// Unit test for the role-matching logic. The end-to-end wiring (JwtAuthGuard +
// RolesGuard on a real @Roles route) gets an e2e test in Unit 3 when the first
// role-restricted endpoint exists.
describe('RolesGuard', () => {
  const makeContext = (user: AuthUser | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  const makeGuard = (required: Role[] | undefined): RolesGuard => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  const admin: AuthUser = { id: '1', email: 'a@t.local', role: Role.ADMIN };
  const staff: AuthUser = { id: '2', email: 's@t.local', role: Role.STAFF };

  it('allows any authenticated user when no roles are required', () => {
    expect(makeGuard(undefined).canActivate(makeContext(staff))).toBe(true);
    expect(makeGuard([]).canActivate(makeContext(staff))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    expect(makeGuard([Role.ADMIN]).canActivate(makeContext(admin))).toBe(true);
  });

  it('denies a user whose role is not in the required list', () => {
    expect(makeGuard([Role.ADMIN]).canActivate(makeContext(staff))).toBe(false);
  });

  it('denies when there is no authenticated user', () => {
    expect(makeGuard([Role.ADMIN]).canActivate(makeContext(undefined))).toBe(
      false,
    );
  });

  it('reads roles from the ROLES_KEY metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    } as unknown as Reflector;
    new RolesGuard(reflector).canActivate(makeContext(admin));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
