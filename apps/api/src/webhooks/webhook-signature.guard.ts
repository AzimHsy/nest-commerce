import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

// Verifies the payment webhook is genuinely from our signer: recompute the
// HMAC-SHA256 of the raw body with WEBHOOK_SECRET and compare (timing-safe)
// against the x-webhook-signature header. This is how real gateways (Stripe,
// CHIP) authenticate callbacks — no bearer token, a shared-secret signature.
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const signature = request.headers['x-webhook-signature'];
    const raw = request.rawBody;

    if (!raw || typeof signature !== 'string') {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const secret = this.config.getOrThrow<string>('WEBHOOK_SECRET');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');

    if (
      provided.length !== expectedBuf.length ||
      !timingSafeEqual(provided, expectedBuf)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return true;
  }
}
