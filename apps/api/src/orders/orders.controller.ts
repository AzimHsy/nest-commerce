import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

// Public storefront endpoints. Checkout creates the order; the confirmation
// page reads it back by id (uuid is the unguessable handle).
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findById(id);
  }
}
