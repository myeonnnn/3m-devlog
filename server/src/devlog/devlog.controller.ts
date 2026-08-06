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
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevLogService } from './devlog.service';
import { CreateDevLogDto } from './dto/create-devlog.dto';
import { UpdateDevLogDto } from './dto/update-devlog.dto';
import { FindDevLogsQueryDto } from './dto/find-devlogs-query.dto';
import { DevLogResponseDto } from './dto/devlog-response.dto';
import { DevLogPageResponseDto } from './dto/devlog-page-response.dto';
import { PopularTagResponseDto } from './dto/popular-tag-response.dto';
import { DevLogStatsResponseDto } from './dto/devlog-stats-response.dto';
import { StreakResponseDto } from './dto/streak-response.dto';

@ApiTags('devlogs')
@ApiCookieAuth()
@Controller('devlogs')
export class DevLogController {
  constructor(private readonly devLogService: DevLogService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: DevLogResponseDto })
  create(@OwnerId() ownerId: string, @Body() dto: CreateDevLogDto) {
    return this.devLogService.create(ownerId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: DevLogPageResponseDto })
  findAll(@OwnerId() ownerId: string, @Query() query: FindDevLogsQueryDto) {
    return this.devLogService.findAll(ownerId, query);
  }

  @Get('tags/popular')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PopularTagResponseDto, isArray: true })
  popularTags(@OwnerId() ownerId: string) {
    return this.devLogService.popularTags(ownerId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: DevLogStatsResponseDto })
  stats(@OwnerId() ownerId: string) {
    return this.devLogService.stats(ownerId);
  }

  @Get('streak')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: StreakResponseDto })
  streak(@OwnerId() ownerId: string) {
    return this.devLogService.streak(ownerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: DevLogResponseDto })
  findOne(@OwnerId() ownerId: string, @Param('id') id: string) {
    return this.devLogService.findOne(ownerId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: DevLogResponseDto })
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
  @ApiNoContentResponse()
  remove(@OwnerId() ownerId: string, @Param('id') id: string) {
    return this.devLogService.remove(ownerId, id);
  }
}
