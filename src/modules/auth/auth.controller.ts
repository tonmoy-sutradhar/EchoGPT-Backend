// // src/modules/auth/auth.controller.ts
// import {
//   Controller,
//   Post,
//   Body,
//   HttpCode,
//   HttpStatus,
//   Req,
// } from '@nestjs/common';
// import type { Request } from 'express';
// import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { AuthService } from './auth.service';
// import { RegisterDto } from './dto/register.dto';
// import { LoginDto } from './dto/login.dto';
// import { RefreshTokenDto } from './dto/refresh-token.dto';
// import { VerifyEmailDto } from './dto/verify-email.dto';
// import { ResendVerificationDto } from './dto/resend-verification.dto';
// import { ForgotPasswordDto } from './dto/forgot-password.dto';
// import { ResetPasswordDto } from './dto/reset-password.dto';
// import { Public, CurrentUser } from '../../common/decorators';
// import type { AuthenticatedUser } from '../../common/interfaces';
// import {
//   ApiSuccess,
//   ApiPublicErrors,
//   ApiConflict,
//   ApiUnauthorized,
// } from '../../common/swagger';

// const userExample = {
//   id: '3f1c2d5e-8a41-4c53-9b6e-1f2a3b4c5d6e',
//   fullName: 'John Doe',
//   email: 'john@example.com',
//   avatarUrl: null,
//   role: 'user',
//   status: 'active',
//   emailVerifiedAt: '2026-09-28T10:00:00.000Z',
//   lastLoginAt: '2026-09-28T10:05:00.000Z',
//   createdAt: '2026-09-28T09:50:00.000Z',
//   updatedAt: '2026-09-28T10:05:00.000Z',
// };

// const tokensExample = {
//   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access...',
//   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
// };

// @ApiTags('Auth')
// @ApiPublicErrors()
// @Controller({ path: 'auth', version: '1' })
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   private meta(req: Request) {
//     return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
//   }

//   @Public()
//   @Post('register')
//   @ApiOperation({
//     summary: 'Register a new user',
//     description:
//       'Creates the account with status `pending_verification`, assigns the Free plan and sends a verification email.',
//   })
//   @ApiSuccess({
//     status: HttpStatus.CREATED,
//     description: 'User registered',
//     message: 'Registration successful. Please verify your email.',
//     data: {
//       user: { ...userExample, status: 'pending_verification' },
//       tokens: tokensExample,
//     },
//   })
//   @ApiConflict('Email is already registered')
//   async register(@Body() dto: RegisterDto, @Req() req: Request) {
//     return this.authService.register(dto, this.meta(req));
//   }

//   @Public()
//   @Post('login')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Login with email and password',
//     description:
//       'Fails with 401 if credentials are wrong, the account is suspended, or the email is not verified.',
//   })
//   @ApiSuccess({
//     description: 'Login successful',
//     message: 'Login successful',
//     data: { user: userExample, tokens: tokensExample },
//   })
//   @ApiUnauthorized('Invalid credentials, unverified email or inactive account')
//   async login(@Body() dto: LoginDto, @Req() req: Request) {
//     return this.authService.login(dto, this.meta(req));
//   }

//   @Public()
//   @Post('refresh')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Refresh tokens',
//     description:
//       'Rotates the session: the old refresh token becomes invalid and a new pair is returned.',
//   })
//   @ApiSuccess({
//     description: 'Tokens refreshed',
//     message: 'Token refreshed successfully',
//     data: { tokens: tokensExample },
//   })
//   @ApiUnauthorized('Invalid, expired or revoked refresh token')
//   async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
//     return this.authService.refresh(dto.refreshToken, this.meta(req));
//   }

//   @Post('logout')
//   @HttpCode(HttpStatus.OK)
//   @ApiBearerAuth('access-token')
//   @ApiOperation({
//     summary: 'Logout current device (revokes the current session)',
//   })
//   @ApiSuccess({ description: 'Logged out', message: 'Logout successful' })
//   @ApiUnauthorized()
//   async logout(@CurrentUser() user: AuthenticatedUser) {
//     return this.authService.logout(user.sessionId, user.id);
//   }

//   @Post('logout-all')
//   @HttpCode(HttpStatus.OK)
//   @ApiBearerAuth('access-token')
//   @ApiOperation({ summary: 'Logout from all devices (revokes every session)' })
//   @ApiSuccess({
//     description: 'Logged out everywhere',
//     message: 'Logged out from all devices',
//   })
//   @ApiUnauthorized()
//   async logoutAll(@CurrentUser() user: AuthenticatedUser) {
//     return this.authService.logoutAllDevices(user.id);
//   }

//   @Public()
//   @Post('verify-email')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Verify email with the token from the email link' })
//   @ApiSuccess({
//     description: 'Email verified',
//     message: 'Email verified successfully',
//   })
//   async verifyEmail(@Body() dto: VerifyEmailDto) {
//     return this.authService.verifyEmail(dto.token);
//   }

//   @Public()
//   @Post('resend-verification')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Resend verification email',
//     description:
//       'Always returns the same message, whether or not the email exists.',
//   })
//   @ApiSuccess({
//     description: 'Request accepted',
//     message:
//       'If the account exists and is unverified, a new link has been sent',
//   })
//   async resendVerification(@Body() dto: ResendVerificationDto) {
//     return this.authService.resendVerification(dto.email);
//   }

//   @Public()
//   @Post('forgot-password')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Request a password reset link',
//     description:
//       'Always returns the same message to avoid leaking which emails are registered. Link expires in 1 hour.',
//   })
//   @ApiSuccess({
//     description: 'Request accepted',
//     message: 'If the account exists, a password reset link has been sent',
//   })
//   async forgotPassword(@Body() dto: ForgotPasswordDto) {
//     return this.authService.forgotPassword(dto.email);
//   }

//   @Public()
//   @Post('reset-password')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Reset password with the emailed token',
//     description:
//       'Single-use token. All existing sessions are revoked on success.',
//   })
//   @ApiSuccess({
//     description: 'Password reset',
//     message: 'Password has been reset successfully',
//   })
//   async resetPassword(@Body() dto: ResetPasswordDto) {
//     return this.authService.resetPassword(dto.token, dto.newPassword);
//   }
// }

// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public, CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private meta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.meta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Login successful' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.meta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({ description: 'Tokens refreshed successfully' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.meta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.sessionId, user.id);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiOkResponse({ description: 'Logged out from all devices' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAllDevices(user.id);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using the token sent via email' })
  @ApiOkResponse({ description: 'Email verified successfully' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the email verification link' })
  @ApiOkResponse({ description: 'Verification email resent (if applicable)' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link via email' })
  @ApiOkResponse({ description: 'Reset link sent (if the account exists)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using the token sent via email' })
  @ApiOkResponse({ description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
