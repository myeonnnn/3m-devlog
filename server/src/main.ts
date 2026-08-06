import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

const DEV_PLACEHOLDER_VALUES = new Set([
  'dev-secret-change-me',
  'placeholder-google-client-id',
  'placeholder-google-client-secret',
  'placeholder-kakao-client-id',
]);

/** 개발용 placeholder 값(.env 기본값)이 그대로 프로덕션에 배포되는 걸 막는다. */
function assertProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'KAKAO_CLIENT_ID',
  ];
  for (const key of required) {
    const value = process.env[key];
    if (!value || DEV_PLACEHOLDER_VALUES.has(value)) {
      throw new Error(
        `${key}가 설정되지 않았거나 개발용 placeholder 값입니다. 프로덕션 배포 전 실제 값으로 교체하세요.`,
      );
    }
  }
}

async function bootstrap() {
  assertProductionEnv();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('3m-devlog API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
