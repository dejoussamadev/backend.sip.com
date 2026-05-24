import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LoginRequestStatus, Prisma } from '@prisma/client';
import {
  LOGIN_REQUEST_APPROVED,
  LOGIN_REQUEST_REJECTED,
} from '../notifications/notification-types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class LoginRequestsService {
  private readonly logger = new Logger(LoginRequestsService.name);

  private readonly defaultInclude = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
      },
    },
    reviewedBy: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  } satisfies Prisma.LoginRequestInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    keyword?: string,
    status?: LoginRequestStatus,
    page = '1',
    limit = '10',
  ) {
    const pagination = normalizePagination(page, limit);
    const take = pagination.limit;
    const currentPage = pagination.page;
    const skip = pagination.skip;

    const where: Prisma.LoginRequestWhereInput = {};

    if (keyword?.trim()) {
      where.OR = [
        {
          user: {
            is: {
              name: { contains: keyword.trim(), mode: 'insensitive' },
            },
          },
        },
        {
          user: {
            is: {
              email: { contains: keyword.trim(), mode: 'insensitive' },
            },
          },
        },
        { fingerprint: { contains: keyword.trim(), mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.loginRequest.findMany({
        where,
        include: this.defaultInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.loginRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: number) {
    const loginRequest = await this.prisma.loginRequest.findUnique({
      where: { id },
      include: this.defaultInclude,
    });

    if (!loginRequest) {
      throw new NotFoundException(`Login request with ID ${id} was not found`);
    }

    return loginRequest;
  }

  async approve(id: number, reviewerId: number, deviceName: string) {
    const loginRequest = await this.findOne(id);

    if (loginRequest.status !== LoginRequestStatus.PENDING) {
      throw new ConflictException(
        'Only pending login requests can be approved',
      );
    }

    const now = new Date();
    const reviewer = await this.prisma.user.findUniqueOrThrow({
      where: { id: reviewerId },
      select: { id: true, name: true },
    });

    await this.prisma.$transaction([
      this.prisma.trustedDevice.upsert({
        where: {
          userId_fingerprint: {
            userId: loginRequest.userId,
            fingerprint: loginRequest.fingerprint,
          },
        },
        create: {
          userId: loginRequest.userId,
          fingerprint: loginRequest.fingerprint,
          deviceName,
          browser: loginRequest.browser,
          operatingSystem: loginRequest.operatingSystem,
          platform: loginRequest.platform,
          userAgent: loginRequest.userAgent,
          ipAddress: loginRequest.ipAddress,
          lastUsedAt: now,
        },
        update: {
          deviceName,
          browser: loginRequest.browser,
          operatingSystem: loginRequest.operatingSystem,
          platform: loginRequest.platform,
          userAgent: loginRequest.userAgent,
          ipAddress: loginRequest.ipAddress,
          lastUsedAt: now,
        },
      }),
      this.prisma.loginRequest.update({
        where: { id },
        data: {
          status: LoginRequestStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: now,
          deviceName,
        },
      }),
    ]);

    await this.notificationsService.notify({
      type: LOGIN_REQUEST_APPROVED,
      message: `Login request for ${loginRequest.user.name} (${loginRequest.user.email}) was approved by ${reviewer.name}.`,
      emailContext: {
        userName: loginRequest.user.name,
        userEmail: loginRequest.user.email,
        reviewerName: reviewer.name,
        fingerprint: loginRequest.fingerprint,
        deviceName,
        browser: loginRequest.browser ?? undefined,
        operatingSystem: loginRequest.operatingSystem ?? undefined,
        platform: loginRequest.platform ?? undefined,
        ipAddress: loginRequest.ipAddress,
      },
      // The reviewer triggered the action, so they are excluded everywhere.
      // The requesting user can't see in-app notifications yet (their device
      // isn't trusted), so they only get an email.
      actorUserId: reviewerId,
      recipients: {
        admins: true,
        emailOnlyUserIds: [loginRequest.userId],
      },
    });

    this.logger.log(`Login request ${id} approved by admin ${reviewerId}`);
    return this.findOne(id);
  }

  async reject(id: number, reviewerId: number) {
    const loginRequest = await this.findOne(id);

    if (loginRequest.status !== LoginRequestStatus.PENDING) {
      throw new ConflictException(
        'Only pending login requests can be rejected',
      );
    }

    const reviewer = await this.prisma.user.findUniqueOrThrow({
      where: { id: reviewerId },
      select: { id: true, name: true },
    });

    await this.prisma.loginRequest.update({
      where: { id },
      data: {
        status: LoginRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    await this.notificationsService.notify({
      type: LOGIN_REQUEST_REJECTED,
      message: `Login request for ${loginRequest.user.name} (${loginRequest.user.email}) was rejected by ${reviewer.name}.`,
      emailContext: {
        userName: loginRequest.user.name,
        userEmail: loginRequest.user.email,
        reviewerName: reviewer.name,
        fingerprint: loginRequest.fingerprint,
        deviceName: loginRequest.deviceName ?? undefined,
        browser: loginRequest.browser ?? undefined,
        operatingSystem: loginRequest.operatingSystem ?? undefined,
        platform: loginRequest.platform ?? undefined,
        ipAddress: loginRequest.ipAddress,
      },
      // Reviewer is excluded; requesting user only gets an email (no in-app
      // notification, since they're not currently logged in).
      actorUserId: reviewerId,
      recipients: {
        admins: true,
        emailOnlyUserIds: [loginRequest.userId],
      },
    });

    this.logger.log(`Login request ${id} rejected by admin ${reviewerId}`);
    return this.findOne(id);
  }
}
