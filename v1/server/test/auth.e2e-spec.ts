import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthProvider } from '../generated/prisma/enums';

interface MeResponse {
  id: string;
  displayName: string;
  email: string | null;
  provider: string;
}

interface StatsResponse {
  totalCount: number;
  topTags: { tag: string; count: number }[];
}

describe('Auth / MyPage (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const userId = `e2e-auth-user-${Date.now()}`;

  function cookieFor(id: string) {
    return `access_token=${jwtService.sign({ sub: id })}`;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    await prisma.user.create({
      data: {
        id: userId,
        provider: AuthProvider.KAKAO,
        providerUserId: userId,
        displayName: 'e2e mypage user',
        email: 'e2e-mypage@example.com',
      },
    });
  });

  afterAll(async () => {
    await prisma.devLog.deleteMany({ where: { ownerId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('/auth/me는 로그인 방식(provider)을 포함해 반환한다', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieFor(userId))
      .expect(200);

    const body = res.body as MeResponse;
    expect(body).toEqual({
      id: userId,
      displayName: 'e2e mypage user',
      email: 'e2e-mypage@example.com',
      provider: 'KAKAO',
    });
  });

  it('/devlogs/stats는 총 로그 수와 인기 태그를 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/devlogs')
      .set('Cookie', cookieFor(userId))
      .send({
        logDate: '2026-07-28',
        learnedNote: '통계 테스트',
        tags: ['stats-e2e'],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/devlogs/stats')
      .set('Cookie', cookieFor(userId))
      .expect(200);

    const body = res.body as StatsResponse;
    expect(body.totalCount).toBeGreaterThanOrEqual(1);
    expect(body.topTags.some((t) => t.tag === 'stats-e2e')).toBe(true);
  });

  it('회원탈퇴하면 계정과 로그가 삭제되고, 이후 같은 토큰은 인증에 실패한다', async () => {
    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Cookie', cookieFor(userId))
      .expect(204);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieFor(userId))
      .expect(401);

    const remainingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    expect(remainingUser).toBeNull();

    const remainingLogs = await prisma.devLog.findMany({
      where: { ownerId: userId },
    });
    expect(remainingLogs).toHaveLength(0);
  });
});
