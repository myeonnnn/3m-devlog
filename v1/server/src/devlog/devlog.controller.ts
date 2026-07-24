import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { DevLogService } from './devlog.service';
import { CreateDevLogDto } from './dto/create-devlog.dto';
import { UpdateDevLogDto } from './dto/update-devlog.dto';
import { FindDevLogsQueryDto } from './dto/find-devlogs-query.dto';

@Controller('devlogs')
export class DevLogController {
  constructor(private readonly devLogService: DevLogService) {}

  @Post()
  create(@OwnerId() ownerId: string, @Body() dto: CreateDevLogDto) {
    return this.devLogService.create(ownerId, dto);
  }

  @Get()
  findAll(@OwnerId() ownerId: string, @Query() query: FindDevLogsQueryDto) {
    return this.devLogService.findAll(ownerId, query);
  }

  @Get('tags/popular')
  popularTags(@OwnerId() ownerId: string) {
    return this.devLogService.popularTags(ownerId);
  }

  @Get(':id')
  findOne(@OwnerId() ownerId: string, @Param('id') id: string) {
    return this.devLogService.findOne(ownerId, id);
  }

  @Patch(':id')
  update(
    @OwnerId() ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDevLogDto,
  ) {
    return this.devLogService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@OwnerId() ownerId: string, @Param('id') id: string) {
    return this.devLogService.remove(ownerId, id);
  }
}
