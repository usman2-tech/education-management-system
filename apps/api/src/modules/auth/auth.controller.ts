/**
 * MODULE: Authentication - Auth Controller
 *
 * PURPOSE:
 * Exposes institutional authentication endpoints: credential login, token refresh,
 * session termination (logout), current authenticated profile, and tenant context.
 *
 * DEPENDENCIES:
 * @nestjs/common, @nestjs/swagger, AuthService, JwtAuthGuard, SchoolIsolationGuard
 *
 * SECURITY:
 * Strict validation with class-validator.
 * Protected endpoints guarded by JwtAuthGuard and SchoolIsolationGuard.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SchoolIsolationGuard } from './guards/school-isolation.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';

@ApiTags('Authentication & Access Control')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate institutional credentials and acquire JWT tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful with JWT tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and obtain a new JWT access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token.' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Terminate active user session and revoke refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body?: Partial<RefreshTokenDto>,
  ) {
    return this.authService.logout(userId, body?.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Retrieve authenticated user identity and institutional profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Get('tenant-context')
  @UseGuards(JwtAuthGuard, SchoolIsolationGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Retrieve verified multi-tenant school isolation context' })
  @ApiResponse({ status: 200, description: 'School isolation context verified.' })
  async getTenantContext(@Req() req: any, @CurrentUser() user: AuthUser) {
    return {
      authenticatedUser: user,
      activeSchoolId: req.activeSchoolId,
      isolationMode: user.role === 'PLATFORM_ADMIN' ? 'GLOBAL_SUPERVISOR' : 'TENANT_ISOLATED',
    };
  }

  // ---------------------------------------------------------------------------
  // INVITATION-BASED REGISTRATION
  // ---------------------------------------------------------------------------

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Issue an institutional invitation for controlled user onboarding' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully.' })
  async inviteUser(
    @CurrentUser() currentUser: AuthUser,
    @Body() dto: InviteUserDto,
  ) {
    return this.authService.inviteUser(currentUser, dto);
  }

  @Get('invitation-details')
  @ApiOperation({ summary: 'Retrieve invitation metadata for the activation screen' })
  @ApiQuery({ name: 'token', required: true, description: 'Raw invitation token' })
  async getInvitationDetails(@Query('token') token: string) {
    return this.authService.getInvitationDetails(token);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume invitation token and establish initial account password' })
  @ApiResponse({ status: 200, description: 'Account successfully activated.' })
  async activateAccount(@Body() dto: ActivateAccountDto) {
    return this.authService.activateAccount(dto);
  }

  // ---------------------------------------------------------------------------
  // PASSWORD RECOVERY
  // ---------------------------------------------------------------------------

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token (generic response)' })
  @ApiResponse({ status: 200, description: 'Reset instructions initiated if account exists.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password with valid single-use token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully and sessions revoked.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
