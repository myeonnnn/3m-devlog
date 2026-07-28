import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthProvider } from '../../generated/prisma/enums';

type MockPrisma = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  devLog: {
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createPrismaMock(): MockPrisma {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    devLog: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
}

describe('UserService', () => {
  let service: UserService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserService(prisma as unknown as PrismaService);
  });

  describe('findOrCreateByProvider', () => {
    it('기존 사용자가 있으면 그대로 반환하고 새로 만들지 않는다', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const result = await service.findOrCreateByProvider({
        provider: AuthProvider.GOOGLE,
        providerUserId: 'google-1',
        displayName: '홍길동',
      });

      expect(result).toEqual({ id: 'user-1' });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('기존 사용자가 없으면 새로 만든다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-2' });

      const result = await service.findOrCreateByProvider({
        provider: AuthProvider.KAKAO,
        providerUserId: 'kakao-1',
        displayName: '홍길동',
      });

      expect(result).toEqual({ id: 'user-2' });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: AuthProvider.KAKAO,
            providerUserId: 'kakao-1',
          }),
        }),
      );
    });
  });

  describe('deleteAccountAndData', () => {
    it('DevLog 전체 삭제와 계정 삭제를 하나의 트랜잭션으로 처리한다', async () => {
      await service.deleteAccountAndData('user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.devLog.deleteMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
