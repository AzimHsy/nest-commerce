import { Role } from '@prisma/client';

// The authenticated principal we attach to the request (never the password hash).
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

// Shape of the signed JWT body. `sub` is the standard subject claim (user id).
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
