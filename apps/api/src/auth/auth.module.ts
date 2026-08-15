import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordService } from './password.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PasswordService],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
