import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { VariantsController } from './variants.controller';
import { ProductsService } from './products.service';
import { VariantsService } from './variants.service';

@Module({
  controllers: [ProductsController, VariantsController],
  providers: [ProductsService, VariantsService],
  // Exported so Unit 4 (orders) can read variants/stock through the service.
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
