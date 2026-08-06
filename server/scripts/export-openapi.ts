import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** Postgres 없이도 스펙을 뽑을 수 있게 PrismaService(실제 $connect 호출)를 no-op으로 대체한다. */
async function main() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({ onModuleInit: async () => {}, onModuleDestroy: async () => {} })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const config = new DocumentBuilder()
    .setTitle('3m-devlog API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  writeFileSync(
    join(process.cwd(), 'openapi.json'),
    JSON.stringify(document, null, 2),
  );

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
