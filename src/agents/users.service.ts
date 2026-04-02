import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  private readonly defaultSelect = {
    id: true,
    name: true,
    agentCode: true,
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

  constructor(private prisma: PrismaService) {}

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
      orderBy: { createdAt: 'desc' },
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

    const agentCode = await this.generateAgentCode();

    const agent = await this.prisma.user.create({
      data: {
        ...createAgentDto,
        email,
        agentCode,
        password: hashedPassword,
        role: createAgentDto.role ?? Role.AGENT,
      },
      select: this.defaultSelect,
    });

    this.logger.log(`User created: ${agent.email} (${agent.agentCode})`);
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

    const take = Number(limit);
    const currentPage = Number(page);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.defaultSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
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
    await this.findAgentByIdOrThrow(id);

    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: this.defaultSelect,
    });
  }

  async findMyProfile(id: number) {
    return this.findOne(id);
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

  async remove(id: number) {
    const existingAgent = await this.findAgentByIdOrThrow(id);

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`User deleted: ${existingAgent.email}`);
    return { message: `User ${existingAgent.name} deleted successfully` };
  }
}
