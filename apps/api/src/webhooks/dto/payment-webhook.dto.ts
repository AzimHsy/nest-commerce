import { IsString, IsUUID, MinLength } from 'class-validator';

export class PaymentWebhookDto {
  // Idempotency key — the payment provider's unique event id.
  @IsString()
  @MinLength(1)
  eventId!: string;

  @IsUUID()
  orderId!: string;
}
