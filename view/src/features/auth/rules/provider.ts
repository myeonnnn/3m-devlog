import type { CurrentUser } from '../types';

export const PROVIDER_LABEL: Record<CurrentUser['provider'], string> = {
  GOOGLE: 'Google',
  KAKAO: 'Kakao',
};
