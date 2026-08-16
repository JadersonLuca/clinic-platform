import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PasswordService } from '../auth/password.service';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TeamController],
  providers: [TeamService, PasswordService],
})
export class TeamModule {}
