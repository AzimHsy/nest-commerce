import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Spring analogy: the gate that requires an authenticated principal. Extends
// Passport's 'jwt' guard — it runs JwtStrategy and 401s if the token is
// missing, malformed, or expired.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
