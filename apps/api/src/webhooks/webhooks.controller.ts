import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { WebhookSignatureGuard } from './webhook-signature.guard';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  // Public but signature-protected. 200 (not 201) — webhooks conventionally
  // return 200 to signal "received", and 200 on a duplicate is what tells the
  // provider to stop retrying.
  @Post('payment')
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  handlePayment(@Body() dto: PaymentWebhookDto) {
    return this.webhooks.processPayment(dto);
  }
}
