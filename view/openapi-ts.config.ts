import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../server/openapi.json',
  output: 'src/lib/api/generated',
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/client-fetch',
      throwOnError: true,
    },
    '@hey-api/sdk',
    {
      name: '@tanstack/react-query',
      queryOptions: true,
      mutationOptions: true,
      infiniteQueryOptions: true,
    },
  ],
});
