import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Spring analogy: this is like a @Component wrapping the JPA EntityManager —
// one injectable that owns the DB connection lifecycle. Nest calls
// onModuleInit/onModuleDestroy the way Spring calls @PostConstruct/@PreDestroy.
//
// Prisma 7 requires a driver adapter: we hand PrismaClient a pg-backed
// adapter built from DATABASE_URL instead of putting the URL in schema.prisma.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
