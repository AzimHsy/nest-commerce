import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

type ProcessResult = { status: 'ok' | 'already_processed' };

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  // Invariant 3: an order transitions to PAID at most once.
  // Guard 1 (fast path): if the event was already recorded, no-op.
  // Guard 2 (race-safe): the WebhookEvent.externalEventId unique constraint —
  // inside the transaction, a concurrent duplicate delivery hits P2002 and we
  // treat it as already-processed. Everything (ledger insert + stock decrement
  // + status flip) commits or rolls back together.
  async processPayment(dto: PaymentWebhookDto): Promise<ProcessResult> {
    const already = await this.prisma.webhookEvent.findUnique({
      where: { externalEventId: dto.eventId },
    });
    if (already) {
      return { status: 'already_processed' };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.webhookEvent.create({
          data: { externalEventId: dto.eventId },
        });

        const order = await tx.order.findUnique({
          where: { id: dto.orderId },
          include: { items: true },
        });
        if (!order) {
          throw new NotFoundException(`Order '${dto.orderId}' not found`);
        }
        if (order.status !== OrderStatus.PENDING) {
          throw new ConflictException('Order is not payable');
        }

        // Conditional decrement (invariant 2): only decrement when enough stock
        // remains. count !== 1 means someone drained it since checkout → 409,
        // and the whole transaction rolls back (no partial decrements).
        for (const item of order.items) {
          const result = await tx.variant.updateMany({
            where: { id: item.variantId, stockQty: { gte: item.qty } },
            data: { stockQty: { decrement: item.qty } },
          });
          if (result.count !== 1) {
            throw new ConflictException(
              `Insufficient stock for variant '${item.variantId}'`,
            );
          }
        }

        await tx.order.update({
          where: { id: dto.orderId },
          data: { status: OrderStatus.PAID },
        });
      });

      return { status: 'ok' };
    } catch (error) {
      // A concurrent delivery of the same event raced us to the ledger insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'already_processed' };
      }
      throw error;
    }
  }
}
