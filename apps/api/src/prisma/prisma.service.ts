import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Spring analogy: this is like a @Component wrapping the JPA EntityManager —
// a single injectable that owns the DB connection lifecycle. Nest calls
// onModuleInit/onModuleDestroy the way Spring calls @PostConstruct/@PreDestroy.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
