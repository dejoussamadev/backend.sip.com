import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LoginRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    keyword?: string,
    status?: LoginRequestStatus,
    page = '1',
    limit = '10',
  ) {
    const take = Number(limit);
    const currentPage = Number(page);
    const skip = (currentPage - 1) * take;

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

  async approve(id: number, reviewerId: number) {
    const loginRequest = await this.findOne(id);

    if (loginRequest.status !== LoginRequestStatus.PENDING) {
      throw new ConflictException('Only pending login requests can be approved');
    }

    const now = new Date();

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
          deviceName: loginRequest.deviceName,
          browser: loginRequest.browser,
          operatingSystem: loginRequest.operatingSystem,
          platform: loginRequest.platform,
          userAgent: loginRequest.userAgent,
          ipAddress: loginRequest.ipAddress,
          lastUsedAt: now,
        },
        update: {
          deviceName: loginRequest.deviceName,
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
        },
      }),
    ]);

    this.logger.log(`Login request ${id} approved by admin ${reviewerId}`);
    return this.findOne(id);
  }

  async reject(id: number, reviewerId: number) {
    const loginRequest = await this.findOne(id);

    if (loginRequest.status !== LoginRequestStatus.PENDING) {
      throw new ConflictException('Only pending login requests can be rejected');
    }

    await this.prisma.loginRequest.update({
      where: { id },
      data: {
        status: LoginRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    this.logger.log(`Login request ${id} rejected by admin ${reviewerId}`);
    return this.findOne(id);
  }
}
