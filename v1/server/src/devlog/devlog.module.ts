import { Module } from '@nestjs/common';
import { DevLogController } from './devlog.controller';
import { DevLogService } from './devlog.service';

@Module({
  controllers: [DevLogController],
  providers: [DevLogService],
})
export class DevLogModule {}
