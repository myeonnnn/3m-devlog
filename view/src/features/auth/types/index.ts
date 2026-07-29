export interface CurrentUser {
  id: string;
  displayName: string;
  email: string | null;
  provider: 'GOOGLE' | 'KAKAO';
}
