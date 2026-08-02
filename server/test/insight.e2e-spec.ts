import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  INSIGHT_GENERATOR,
  InsightGenerator,
} from '../src/insight/insight-generator.port';
import { AuthProvider } from '../generated/prisma/enums';

describe('Insight (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const ownerId = `e2e-insight-owner-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  const fakeGenerator: InsightGenerator = {
    generate: async () => ({ summary: '가짜 요약', patterns: ['가짜 패턴'] }),
  };

  function cookieFor(userId: string) {
    return `access_token=${jwtService.sign({ sub: userId })}`;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(INSIGHT_GENERATOR)
      .useValue(fakeGenerator)
      .compile();

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
        id: ownerId,
        provider: AuthProvider.GOOGLE,
        providerUserId: ownerId,
        displayName: 'e2e insight owner',
      },
    });
  });

  afterAll(async () => {
    await prisma.insight.deleteMany({ where: { ownerId } });
    await prisma.devLog.deleteMany({ where: { ownerId } });
    await prisma.user.delete({ where: { id: ownerId } });
    await app.close();
  });

  it('로그인 없이 요청하면 401', async () => {
    await request(app.getHttpServer())
      .post('/insights/generate')
      .send({ periodType: 'MONTHLY', periodKey: '2026-08' })
      .expect(401);
  });

  it('해당 기간에 로그가 없으면 422를 반환하고 저장하지 않는다', async () => {
    await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: '2020-01' })
      .expect(422);
  });

  it('미래 기간을 요청하면 400', async () => {
    await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: '2999-01' })
      .expect(400);
  });

  it('로그가 있는 기간을 생성하면 200과 함께 저장되고, latest에서 조회된다', async () => {
    await prisma.devLog.create({
      data: {
        ownerId,
        logDate: new Date(today),
        learnedNote: 'e2e insight용 로그',
      },
    });
    const currentMonth = today.slice(0, 7);

    const generateRes = await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: currentMonth })
      .expect(201);

    expect(generateRes.body.summary).toBe('가짜 요약');
    expect(generateRes.body.logCount).toBe(1);

    const latestRes = await request(app.getHttpServer())
      .get('/insights/latest')
      .set('Cookie', cookieFor(ownerId))
      .expect(200);

    expect(latestRes.body.monthly.periodKey).toBe(currentMonth);
    expect(latestRes.body.weekly).toBeNull();
  });

  it('같은 기간을 다시 생성 요청하면 덮어써서 1건만 유지된다', async () => {
    const currentMonth = today.slice(0, 7);

    await request(app.getHttpServer())
      .post('/insights/generate')
      .set('Cookie', cookieFor(ownerId))
      .send({ periodType: 'MONTHLY', periodKey: currentMonth })
      .expect(201);

    const count = await prisma.insight.count({
      where: { ownerId, periodType: 'MONTHLY', periodKey: currentMonth },
    });
    expect(count).toBe(1);
  });

  it('저장된 결과가 없는 기간은 GET /insights가 null을 반환한다', async () => {
    const res = await request(app.getHttpServer())
      .get('/insights')
      .query({ periodType: 'WEEKLY', periodKey: '2020-W01' })
      .set('Cookie', cookieFor(ownerId))
      .expect(200);

    expect(res.body).toEqual({ insight: null });
  });

  it('저장된 결과가 있는 기간은 GET /insights가 재생성 없이 그대로 반환한다', async () => {
    const currentMonth = today.slice(0, 7);

    const res = await request(app.getHttpServer())
      .get('/insights')
      .query({ periodType: 'MONTHLY', periodKey: currentMonth })
      .set('Cookie', cookieFor(ownerId))
      .expect(200);

    expect(res.body.insight.periodKey).toBe(currentMonth);
    expect(res.body.insight.summary).toBe('가짜 요약');
  });
});
