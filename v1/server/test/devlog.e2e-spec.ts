import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface DevLogResponse {
  id: string;
  tags: string[];
  troubleshootingNote: string | null;
}

describe('DevLog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ownerId = `e2e-owner-${Date.now()}`;
  const otherOwnerId = `e2e-owner-other-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.devLog.deleteMany({
      where: { ownerId: { in: [ownerId, otherOwnerId] } },
    });
    await app.close();
  });

  it('x-user-id 헤더가 없으면 400을 반환한다', async () => {
    await request(app.getHttpServer()).get('/devlogs').expect(400);
  });

  it('learnedNote 없이 생성하면 400을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/devlogs')
      .set('x-user-id', ownerId)
      .send({ logDate: '2026-07-27' })
      .expect(400);
  });

  it('DevLog를 생성하면 태그가 대소문자 무관하게 정규화되어 저장된다', async () => {
    const res = await request(app.getHttpServer())
      .post('/devlogs')
      .set('x-user-id', ownerId)
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
      .set('x-user-id', ownerId)
      .expect(200);

    const devLogs = res.body as DevLogResponse[];
    expect(devLogs.length).toBeGreaterThan(0);
    expect(devLogs.every((log) => log.tags.includes('React'))).toBe(true);
  });

  it('키워드로 검색할 수 있다', async () => {
    const res = await request(app.getHttpServer())
      .get('/devlogs')
      .query({ search: 'CORS' })
      .set('x-user-id', ownerId)
      .expect(200);

    const devLogs = res.body as DevLogResponse[];
    expect(
      devLogs.some((log) => log.troubleshootingNote?.includes('CORS')),
    ).toBe(true);
  });

  it('다른 사용자는 조회할 수 없다 (403)', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/devlogs')
      .set('x-user-id', ownerId);
    const [devLog] = listRes.body as DevLogResponse[];

    await request(app.getHttpServer())
      .get(`/devlogs/${devLog.id}`)
      .set('x-user-id', otherOwnerId)
      .expect(403);
  });

  it('수정 시 태그를 완전히 교체한다', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/devlogs')
      .set('x-user-id', ownerId);
    const [devLog] = listRes.body as DevLogResponse[];

    const res = await request(app.getHttpServer())
      .patch(`/devlogs/${devLog.id}`)
      .set('x-user-id', ownerId)
      .send({ tags: ['typescript'] })
      .expect(200);

    const updated = res.body as DevLogResponse;
    expect(updated.tags).toEqual(['typescript']);
  });

  it('삭제 후에는 404를 반환한다', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/devlogs')
      .set('x-user-id', ownerId);
    const [devLog] = listRes.body as DevLogResponse[];

    await request(app.getHttpServer())
      .delete(`/devlogs/${devLog.id}`)
      .set('x-user-id', ownerId)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/devlogs/${devLog.id}`)
      .set('x-user-id', ownerId)
      .expect(404);
  });
});
