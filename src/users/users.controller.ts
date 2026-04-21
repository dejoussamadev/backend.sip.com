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
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Create a new user as an admin.
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.usersService.create(createAgentDto);
  }

  // Get all users with optional name and role filters.
  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @CurrentUser() user: any,
    @Query('keyword') keyword?: string,
    @Query('role') role?: Role,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.usersService.findAll(
      user.id,
      keyword,
      role,
      status,
      page,
      limit,
    );
  }

  // Return the authenticated user's own profile.
  @Get('profile/me')
  @Roles(Role.AGENT, Role.ADMIN)
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.findMyProfile(user.id);
  }

  @Patch('profile/me')
  @Roles(Role.AGENT, Role.ADMIN)
  updateMyProfile(
    @CurrentUser() user: any,
    @Body() updateMyProfileDto: UpdateMyProfileDto,
  ) {
    return this.usersService.updateMyProfile(user.id, updateMyProfileDto);
  }

  @Get('list/simple')
  @Roles(Role.AGENT, Role.ADMIN)
  findSimpleList() {
    return this.usersService.findSimpleList();
  }

  // Get a single user by id as an admin.
  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // Update a user by id as an admin.
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.usersService.update(id, updateAgentDto);
  }

  // Toggle a user's active status by id as an admin.
  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id);
  }

  // Delete a user by id as an admin.
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
