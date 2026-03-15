import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { SingleImageInterceptor } from '../upload/interceptors/file-upload.interceptor';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ==================== ROUTES ADMIN ====================

  // Créer un agent
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  // Créer un admin (seul un ADMIN peut le faire)
  @Post('create-admin')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.agentsService.createAdmin(createAdminDto);
  }

  // Liste de tous les agents
  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.agentsService.findAll();
  }

  // ==================== ROUTES PROFIL (Agent connecté) ====================

  // Mon profil
  @Get('profile/me')
  @Roles(Role.AGENT, Role.ADMIN)
  getMyProfile(@CurrentUser() user: any) {
    return this.agentsService.findOne(user.id);
  }

  // Modifier mon profil
  @Patch('profile/me')
  @Roles(Role.AGENT, Role.ADMIN)
  @UseInterceptors(SingleImageInterceptor('photo'))
  updateMyProfile(
      @CurrentUser() user: any,
      @Body() updateProfileDto: UpdateProfileDto,
      @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateProfileDto.photo = file.path;
    }
    return this.agentsService.updateProfile(user.id, updateProfileDto);
  }

  // Changer mon mot de passe
  @Patch('profile/change-password')
  @Roles(Role.AGENT, Role.ADMIN)
  changePassword(
      @CurrentUser() user: any,
      @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.agentsService.changePassword(user.id, changePasswordDto);
  }

  // ==================== ROUTES ADMIN (par ID) ====================
// Récupérer les 20 premiers agents (id + nom)
  @Get('list/simple')
  @Roles(Role.ADMIN)
  getSimpleList() {
    return this.agentsService.getSimpleList();
  }

  // Détails d'un agent
  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agentsService.findOne(id);
  }

  // Modifier un agent
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, updateAgentDto);
  }

  // Supprimer un agent
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agentsService.remove(id);
  }

  // Activer/Désactiver un agent
  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.agentsService.toggleActive(id);
  }
}