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

interface DevLogResponse {
  id: string;
  tags: string[];
  troubleshootingNote: string | null;
}

describe('DevLog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const ownerId = `e2e-owner-${Date.now()}`;
  const otherOwnerId = `e2e-owner-other-${Date.now()}`;

  function cookieFor(userId: string) {
    return `access_token=${jwtService.sign({ sub: userId })}`;
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

    // JwtStrategy가 계정 존재 여부를 확인하므로, 테스트용 User를 실제로 만들어둔다.
    await prisma.user.createMany({
      data: [
        {
          id: ownerId,
          provider: AuthProvider.GOOGLE,
          providerUserId: ownerId,
          displayName: 'e2e owner',
        },
        {
          id: otherOwnerId,
          provider: AuthProvider.GOOGLE,
          providerUserId: otherOwnerId,
          displayName: 'e2e other owner',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.devLog.deleteMany({
      where: { ownerId: { in: [ownerId, otherOwnerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, otherOwnerId] } },
    });
    await app.close();
  });

  it('로그인(쿠키) 없이 요청하면 401을 반환한다', async () => {
    await request(app.getHttpServer()).get('/devlogs').expect(401);
  });

  it('learnedNote 없이 생성하면 400을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/devlogs')
      .set('Cookie', cookieFor(ownerId))
      .send({ logDate: '2026-07-27' })
      .expect(400);
  });

  it('DevLog를 생성하면 태그가 대소문자 무관하게 정규화되어 저장된다', async () => {
    const res = await request(app.getHttpServer())
      .post('/devlogs')
      .set('Cookie', cookieFor(ownerId))
      .send({
        logDate: '2026-07-27',
        learnedNote: 'e2e 테스트로 배운 것',
        troubleshootingNote: 'CORS 이슈 해결',
        tags: ['React', 'react', '#Nest'],
      })
      .expect(201);

    const created = res.body as DevLogResponse;
    expect(created.tags.sort()).toEqual(['Nest', 'React'].sort());
  });

  it('태그로 목록을 필터링할 수 있다', async () => {
    const res = await request(app.getHttpServer())
      .get('/devlogs')
      .query({ tag: 'react' })
      .set('Cookie', cookieFor(ownerId))
      .expect(200);

    const devLogs = res.body as DevLogResponse[];
    expect(devLogs.length).toBeGreaterThan(0);
    expect(devLogs.every((log) => log.tags.includes('React'))).toBe(true);
  });

  it('키워드로 검색할 수 있다', async () => {
    const res = await request(app.getHttpServer())
      .get('/devlogs')
      .query({ search: 'CORS' })
      .set('Cookie', cookieFor(ownerId))
      .expect(200);

    const devLogs = res.body as DevLogResponse[];
    expect(
      devLogs.some((log) => log.troubleshootingNote?.includes('CORS')),
    ).toBe(true);
  });

  it('다른 사용자는 조회할 수 없다 (403)', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/devlogs')
      .set('Cookie', cookieFor(ownerId));
    const [devLog] = listRes.body as DevLogResponse[];

    await request(app.getHttpServer())
      .get(`/devlogs/${devLog.id}`)
      .set('Cookie', cookieFor(otherOwnerId))
      .expect(403);
  });

  it('수정 시 태그를 완전히 교체한다', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/devlogs')
      .set('Cookie', cookieFor(ownerId));
    const [devLog] = listRes.body as DevLogResponse[];

    const res = await request(app.getHttpServer())
      .patch(`/devlogs/${devLog.id}`)
      .set('Cookie', cookieFor(ownerId))
      .send({ tags: ['typescript'] })
      .expect(200);

    const updated = res.body as DevLogResponse;
    expect(updated.tags).toEqual(['typescript']);
  });

  it('삭제 후에는 404를 반환한다', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/devlogs')
      .set('Cookie', cookieFor(ownerId));
    const [devLog] = listRes.body as DevLogResponse[];

    await request(app.getHttpServer())
      .delete(`/devlogs/${devLog.id}`)
      .set('Cookie', cookieFor(ownerId))
      .expect(204);

    await request(app.getHttpServer())
      .get(`/devlogs/${devLog.id}`)
      .set('Cookie', cookieFor(ownerId))
      .expect(404);
  });
});
