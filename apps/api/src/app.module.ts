import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // RolesGuard runs app-wide, but only enforces on routes that both carry
    // @Roles metadata AND a JwtAuthGuard (which populates request.user).
    // Routes without @Roles pass through untouched.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
