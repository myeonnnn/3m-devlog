import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../server/openapi.json',
  output: 'src/lib/api/generated',
  plugins: ['@hey-api/typescript'],
});
