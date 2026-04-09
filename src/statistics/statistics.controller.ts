import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @Roles(Role.ADMIN, Role.AGENT)
  getOverview(@CurrentUser() user: { id: number; role: Role }) {
    return this.statisticsService.getOverview(user);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminStatistics() {
    return this.statisticsService.getAdminStatistics();
  }
}
