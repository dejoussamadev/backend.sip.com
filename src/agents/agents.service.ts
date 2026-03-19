import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
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

  private async generateAgentCode(): Promise<string> {
    const lastAgent = await this.prisma.agent.findFirst({
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

  // ==================== MÉTHODES ADMIN ====================

  async create(createAgentDto: CreateAgentDto) {
    const email = createAgentDto.email.toLowerCase().trim();

    const existingAgent = await this.prisma.agent.findUnique({
      where: { email },
    });

    if (existingAgent) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(
      createAgentDto.password,
      this.SALT_ROUNDS,
    );

    const agentCode = await this.generateAgentCode();

    const agent = await this.prisma.agent.create({
      data: {
        ...createAgentDto,
        email,
        agentCode,
        password: hashedPassword,
        role: Role.AGENT, // Force le rôle AGENT
      },
      select: this.defaultSelect,
    });

    this.logger.log(`Agent créé: ${agent.email} (${agent.agentCode})`);
    return agent;
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    const email = createAdminDto.email.toLowerCase().trim();

    const existingAgent = await this.prisma.agent.findUnique({
      where: { email },
    });

    if (existingAgent) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(
      createAdminDto.password,
      this.SALT_ROUNDS,
    );

    const agentCode = await this.generateAgentCode();

    const admin = await this.prisma.agent.create({
      data: {
        ...createAdminDto,
        email,
        agentCode,
        password: hashedPassword,
        role: Role.ADMIN, // Force le rôle ADMIN
      },
      select: this.defaultSelect,
    });

    this.logger.log(`Admin créé: ${admin.email} (${admin.agentCode})`);

    return {
      message: 'Admin créé avec succès',
      admin,
    };
  }

  async findAll() {
    return this.prisma.agent.findMany({
      select: this.defaultSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: this.defaultSelect,
    });

    if (!agent) {
      throw new NotFoundException(`Agent avec l'ID ${id} introuvable`);
    }

    return agent;
  }

  async update(id: number, updateAgentDto: UpdateAgentDto) {
    const existingAgent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      throw new NotFoundException(`Agent avec l'ID ${id} introuvable`);
    }

    // Vérifier l'unicité de l'email si modifié
    if (updateAgentDto.email && updateAgentDto.email !== existingAgent.email) {
      const emailExists = await this.prisma.agent.findUnique({
        where: { email: updateAgentDto.email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    const updateData: any = { ...updateAgentDto };

    // Normaliser l'email
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }

    // Hasher le mot de passe si fourni
    if (updateAgentDto.password) {
      updateData.password = await bcrypt.hash(
        updateAgentDto.password,
        this.SALT_ROUNDS,
      );
    }

    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: updateData,
      select: this.defaultSelect,
    });

    this.logger.log(`Agent modifié par admin: ${updatedAgent.email}`);
    return updatedAgent;
  }

  async remove(id: number) {
    const existingAgent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      throw new NotFoundException(`Agent avec l'ID ${id} introuvable`);
    }

    await this.prisma.agent.delete({
      where: { id },
    });

    this.logger.log(`Agent supprimé: ${existingAgent.email}`);
    return { message: `Agent ${existingAgent.name} supprimé avec succès` };
  }

  async toggleActive(id: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent avec l'ID ${id} introuvable`);
    }

    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: { isActive: !agent.isActive },
      select: this.defaultSelect,
    });

    const status = updatedAgent.isActive ? 'activé' : 'désactivé';
    this.logger.log(`Agent ${updatedAgent.email} ${status}`);

    return {
      message: `Agent ${updatedAgent.name} ${status} avec succès`,
      agent: updatedAgent,
    };
  }

  // ==================== MÉTHODES AGENT (profil personnel) ====================

  async updateProfile(id: number, updateProfileDto: UpdateProfileDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Agent introuvable');
    }

    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: updateProfileDto,
      select: this.defaultSelect,
    });

    this.logger.log(`Profil modifié par l'agent: ${updatedAgent.email}`);
    return updatedAgent;
  }
  // Récupérer les 20 premiers agents (id + nom) - ADMIN seulement
  async getSimpleList() {
    return this.prisma.agent.findMany({
      where: { isActive: true, role: Role.AGENT },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  async changePassword(id: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Vérifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe et la confirmation ne correspondent pas',
      );
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException('Agent introuvable');
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      agent.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    // Hasher et sauvegarder le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.agent.update({
      where: { id },
      data: { password: hashedPassword },
    });

    this.logger.log(`Mot de passe modifié par l'agent: ${agent.email}`);
    return { message: 'Mot de passe modifié avec succès' };
  }
}
