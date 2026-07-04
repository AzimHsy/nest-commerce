import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  controllers: [VouchersController],
  providers: [VouchersService],
  // OrdersModule consumes validateForOrder/computeDiscountSen at checkout.
  exports: [VouchersService],
})
export class VouchersModule {}
