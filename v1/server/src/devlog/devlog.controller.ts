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
  UseGuards,
} from '@nestjs/common';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevLogService } from './devlog.service';
import { CreateDevLogDto } from './dto/create-devlog.dto';
import { UpdateDevLogDto } from './dto/update-devlog.dto';
import { FindDevLogsQueryDto } from './dto/find-devlogs-query.dto';

@Controller('devlogs')
export class DevLogController {
  constructor(private readonly devLogService: DevLogService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@OwnerId() ownerId: string, @Body() dto: CreateDevLogDto) {
    return this.devLogService.create(ownerId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@OwnerId() ownerId: string, @Query() query: FindDevLogsQueryDto) {
    return this.devLogService.findAll(ownerId, query);
  }

  @Get('tags/popular')
  @UseGuards(JwtAuthGuard)
  popularTags(@OwnerId() ownerId: string) {
    return this.devLogService.popularTags(ownerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@OwnerId() ownerId: string, @Param('id') id: string) {
    return this.devLogService.findOne(ownerId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @OwnerId() ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDevLogDto,
  ) {
    return this.devLogService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  remove(@OwnerId() ownerId: string, @Param('id') id: string) {
    return this.devLogService.remove(ownerId, id);
  }
}
