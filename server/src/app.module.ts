import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DevLogModule } from './devlog/devlog.module';
import { AuthModule } from './auth/auth.module';
import { InsightModule } from './insight/insight.module';

@Module({
  imports: [PrismaModule, DevLogModule, AuthModule, InsightModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
