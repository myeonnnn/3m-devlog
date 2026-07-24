import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DevLogModule } from './devlog/devlog.module';

@Module({
  imports: [PrismaModule, DevLogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
