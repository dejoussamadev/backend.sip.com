import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LoginRequestQueryDto } from './dto/login-request-query.dto';
import { LoginRequestsService } from './login-requests.service';

@Controller('login-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoginRequestsController {
  constructor(private readonly loginRequestsService: LoginRequestsService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: LoginRequestQueryDto) {
    return this.loginRequestsService.findAll(
      query.keyword,
      query.status,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.loginRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.loginRequestsService.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  reject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.loginRequestsService.reject(id, user.id);
  }
}
