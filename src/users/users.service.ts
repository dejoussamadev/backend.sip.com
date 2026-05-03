import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { NotificationType, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizePagination } from '../common/utils/pagination.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  private readonly defaultSelect = {
    id: true,
    name: true,
    agentCode: true,
    emp_code: true,
    email: true,
    mobile: true,
    countryCode: true,
    designation: true,
    photo: true,
    bookmarkLimit: true,
    onlinePropertyLimit: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Ensure the user exists before running admin actions.
  private async findAgentByIdOrThrow(id: number) {
    const agent = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`User with ID ${id} was not found`);
    }

    return agent;
  }

  private async generateAgentCode(): Promise<string> {
    const lastAgent = await this.prisma.user.findFirst({
      orderBy: { agentCode: 'desc' },
      select: { agentCode: true },
    });

    let nextNumber = 1;
    if (lastAgent?.agentCode) {
      const match = lastAgent.agentCode.match(/AGT(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `AGT${String(nextNumber).padStart(5, '0')}`;
  }

  async create(createAgentDto: CreateAgentDto) {
    const email = createAgentDto.email.toLowerCase().trim();

    const existingAgent = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingAgent) {
      throw new ConflictException('This email is already in use');
    }

    const hashedPassword = await bcrypt.hash(
      createAgentDto.password,
      this.SALT_ROUNDS,
    );

    const MAX_RETRIES = 3;
    let agent;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const agentCode = await this.generateAgentCode();
      try {
        agent = await this.prisma.user.create({
          data: {
            ...createAgentDto,
            email,
            agentCode,
            password: hashedPassword,
            role: createAgentDto.role ?? Role.AGENT,
          },
          select: this.defaultSelect,
        });
        break;
      } catch (error) {
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';
        if (!isUniqueViolation || attempt === MAX_RETRIES - 1) {
          throw error;
        }
      }
    }

    this.logger.log(`User created: ${agent.email} (${agent.agentCode})`);

    await this.notificationsService.notify({
      type: NotificationType.AGENT_CREATED,
      message: `A new agent ${agent.name} (${agent.agentCode}) has been added.`,
      entityId: agent.id,
      emailContext: { agentName: agent.name, agentCode: agent.agentCode },
    });

    return agent;
  }

  async findAll(
    currentUserId: number,
    keyword?: string,
    role?: Role,
    status?: string,
    page = '1',
    limit = '10',
  ) {
    // Support filtering by partial name and exact role.
    const where: Prisma.UserWhereInput = {
      id: {
        not: currentUserId,
      },
    };

    if (keyword?.trim()) {
      where.name = {
        contains: keyword.trim(),
        mode: 'insensitive',
      };
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.isActive = status === 'active';
    }

    const pagination = normalizePagination(page, limit);
    const take = pagination.limit;
    const currentPage = pagination.page;
    const skip = pagination.skip;

    const [rawData, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...this.defaultSelect,
          _count: { select: { properties: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = rawData.map(({ _count, ...user }) => ({
      ...user,
      propertiesCount: _count.properties,
    }));

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
    await this.findAgentByIdOrThrow(id);

    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: this.defaultSelect,
    });
  }

  async findMyProfile(id: number) {
    return this.findOne(id);
  }

  async updateMyProfile(id: number, dto: UpdateMyProfileDto) {
    await this.findAgentByIdOrThrow(id);

    if (dto.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase().trim(), NOT: { id } },
      });
      if (emailExists) {
        throw new ConflictException('This email is already in use');
      }
      dto.email = dto.email.toLowerCase().trim();
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.defaultSelect,
    });
  }

  async findSimpleList() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: number, updateAgentDto: UpdateAgentDto) {
    const existingAgent = await this.findAgentByIdOrThrow(id);

    if (updateAgentDto.email && updateAgentDto.email !== existingAgent.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateAgentDto.email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new ConflictException('This email is already in use');
      }
    }

    // Normalize mutable fields before persisting them.
    const updateData: any = { ...updateAgentDto };

    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }

    if (updateAgentDto.password) {
      updateData.password = await bcrypt.hash(
        updateAgentDto.password,
        this.SALT_ROUNDS,
      );
    }

    const updatedAgent = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.defaultSelect,
    });

    this.logger.log(`User updated by admin: ${updatedAgent.email}`);

    await this.notificationsService.notify({
      type: NotificationType.AGENT_UPDATED,
      message: `Agent ${updatedAgent.name} (${updatedAgent.agentCode}) has been updated.`,
      entityId: updatedAgent.id,
      emailContext: {
        agentName: updatedAgent.name,
        agentCode: updatedAgent.agentCode,
      },
    });

    return updatedAgent;
  }

  async toggleActive(id: number) {
    const existingAgent = await this.findAgentByIdOrThrow(id);

    const updatedAgent = await this.prisma.user.update({
      where: { id },
      data: { isActive: !existingAgent.isActive },
      select: this.defaultSelect,
    });

    this.logger.log(
      `User ${updatedAgent.email} ${updatedAgent.isActive ? 'activated' : 'disabled'} by admin`,
    );

    return {
      message: `User ${updatedAgent.name} ${updatedAgent.isActive ? 'activated' : 'disabled'} successfully`,
      user: updatedAgent,
    };
  }

  async remove(id: number, reassignToAgentId?: number) {
    const existingAgent = await this.findAgentByIdOrThrow(id);

    const propertiesCount = await this.prisma.property.count({
      where: { userId: id },
    });

    if (propertiesCount > 0 && !reassignToAgentId) {
      throw new BadRequestException(
        `Cannot delete user: they have ${propertiesCount} assigned ${propertiesCount === 1 ? 'property' : 'properties'}. Reassign them to another agent first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (propertiesCount > 0 && reassignToAgentId) {
        await tx.property.updateMany({
          where: { userId: id },
          data: { userId: reassignToAgentId },
        });
      }
      await tx.user.delete({ where: { id } });
    });

    this.logger.log(`User deleted: ${existingAgent.email}`);

    await this.notificationsService.notify({
      type: NotificationType.AGENT_DELETED,
      message: `Agent ${existingAgent.name} (${existingAgent.agentCode}) has been deleted.`,
      emailContext: {
        agentName: existingAgent.name,
        agentCode: existingAgent.agentCode,
      },
    });

    return { message: `User ${existingAgent.name} deleted successfully` };
  }
}
