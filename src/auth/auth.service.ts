import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // Normaliser l'email
    const email = loginDto.email.toLowerCase().trim();

    // 1. Trouver l'agent par email
    const agent = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!agent) {
      this.logger.warn(`Tentative de connexion échouée: email inconnu - ${email}`);
      // Message générique pour éviter l'énumération des utilisateurs
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 2. Vérifier si le compte est actif
    if (!agent.isActive) {
      this.logger.warn(`Tentative de connexion sur compte désactivé: ${email}`);
      throw new ForbiddenException(
          'Votre compte est désactivé. Contactez l\'administrateur.',
      );
    }

    // 3. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        agent.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Mot de passe incorrect pour: ${email}`);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 4. Générer le token JWT avec plus d'informations
    const payload = {
      sub: agent.id,
      email: agent.email,
      role: agent.role,
      name: agent.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // 5. Log de la connexion réussie
    this.logger.log(`Connexion réussie: ${email} (${agent.role})`);

    // 6. Retourner le token et les infos utilisateur (sans le mot de passe)
    const { password, ...agentWithoutPassword } = agent;

    return {
      access_token: accessToken,
      user: agentWithoutPassword,
    };
  }

  async getProfile(userId: number) {
    const agent = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
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
      },
    });

    if (!agent) {
      throw new UnauthorizedException('Agent non trouvé');
    }

    return agent;
  }

  async logout(userId: number, userEmail: string) {
    this.logger.log(`Déconnexion de l'utilisateur: ${userEmail} (ID: ${userId})`);
    return {
      message: 'Déconnexion réussie',
      success: true,
    };
  }
}
