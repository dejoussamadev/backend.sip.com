import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';

describe('UsersService.changeMyPassword', () => {
  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let oldHash: string;

  beforeAll(async () => {
    oldHash = await bcrypt.hash('OldPass123', 4);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, password: oldHash, isActive: true }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const catalog = new ErrorCatalogService();
    catalog.onModuleInit();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: {} },
        { provide: ErrorCatalogService, useValue: catalog },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('changes the password when current password matches', async () => {
    await expect(
      service.changeMyPassword(1, { currentPassword: 'OldPass123', newPassword: 'NewPass456' }),
    ).resolves.toEqual({ success: true });

    const call = prisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 1 });
    expect(Object.keys(call.data)).toEqual(['password']);
    expect(await bcrypt.compare('NewPass456', call.data.password)).toBe(true);
  });

  it('rejects a wrong current password with PASSWORD_CHANGE_CURRENT_INVALID and does not update', async () => {
    await expect(
      service.changeMyPassword(1, { currentPassword: 'Wrong', newPassword: 'NewPass456' }),
    ).rejects.toMatchObject({
      entries: [
        {
          field: 'currentPassword',
          code: 'PASSWORD_CHANGE_CURRENT_INVALID',
          message: 'Current password is incorrect.',
        },
      ],
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a new password equal to the current one with PASSWORD_CHANGE_SAME_AS_CURRENT', async () => {
    await expect(
      service.changeMyPassword(1, { currentPassword: 'OldPass123', newPassword: 'OldPass123' }),
    ).rejects.toMatchObject({
      entries: [{ field: 'newPassword', code: 'PASSWORD_CHANGE_SAME_AS_CURRENT' }],
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.changeMyPassword(99, { currentPassword: 'x', newPassword: 'NewPass456' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ChangeMyPasswordDto', () => {
  const messages = async (body: object) => {
    const errors = await validate(plainToInstance(ChangeMyPasswordDto, body));
    return errors.flatMap((e) => Object.values(e.constraints ?? {}));
  };

  it('requires the current password', async () => {
    expect(await messages({ currentPassword: '', newPassword: 'NewPass456' })).toContain(
      'PASSWORD_CHANGE_CURRENT_REQUIRED',
    );
  });

  it('rejects a 7-character new password', async () => {
    expect(await messages({ currentPassword: 'x', newPassword: 'short7!' })).toContain(
      'PASSWORD_RESET_PASSWORD_WEAK',
    );
  });

  it('accepts an 8-character new password', async () => {
    expect(await messages({ currentPassword: 'x', newPassword: '12345678' })).toEqual([]);
  });
});
