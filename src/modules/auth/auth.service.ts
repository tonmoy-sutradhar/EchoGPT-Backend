// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Session } from './entities/session.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, comparePassword } from '../../common/utils';
import { JwtPayload } from '../../common/interfaces';
import { Role as RoleEnum } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationsRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetsRepository: Repository<PasswordReset>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const defaultRole = await this.rolesRepository.findOne({
      where: { name: RoleEnum.USER },
    });
    if (!defaultRole) {
      throw new BadRequestException('Default role is not configured');
    }

    const user = this.usersRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash: await hashPassword(dto.password),
      fullName: dto.fullName,
      roleId: defaultRole.id,
      status: UserStatus.PENDING_VERIFICATION,
    });
    const saved = await this.usersRepository.save(user);
    saved.role = defaultRole;

    await this.issueEmailVerification(saved);
    await this.subscriptionsService.ensureFreeSubscription(saved.id);

    const tokens = await this.issueTokens(saved, meta);
    this.logger.log(`User registered: ${saved.id}`);

    return {
      message: 'Registration successful. Please verify your email.',
      data: { user: this.usersService.toResponse(saved), tokens },
    };
  }

  // without verify email
  // async login(dto: LoginDto, meta: RequestMeta) {
  //   const user = await this.usersRepository.findOne({
  //     where: { email: dto.email.toLowerCase() },
  //     relations: ['role'],
  //   });

  //   if (!user || user.deletedAt) {
  //     throw new UnauthorizedException('Invalid email or password');
  //   }

  //   const passwordValid = await comparePassword(
  //     dto.password,
  //     user.passwordHash,
  //   );
  //   if (!passwordValid) {
  //     throw new UnauthorizedException('Invalid email or password');
  //   }

  //   if (
  //     user.status === UserStatus.SUSPENDED ||
  //     user.status === UserStatus.DELETED
  //   ) {
  //     throw new UnauthorizedException('This account is not active');
  //   }

  //   user.lastLoginAt = new Date();
  //   await this.usersRepository.save(user);

  //   const tokens = await this.issueTokens(user, meta);
  //   this.logger.log(`User logged in: ${user.id}`);

  //   return {
  //     message: 'Login successful',
  //     data: { user: this.usersService.toResponse(user), tokens },
  //   };
  // }

  // src/modules/auth/auth.service.ts

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['role'],
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DELETED
    ) {
      throw new UnauthorizedException('This account is not active');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for the verification link.',
      );
    }

    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const tokens = await this.issueTokens(user, meta);
    this.logger.log(`User logged in: ${user.id}`);

    return {
      message: 'Login successful',
      data: { user: this.usersService.toResponse(user), tokens },
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.sessionsRepository.findOne({
      where: { id: payload.sid },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
      session.revokedAt = new Date();
      await this.sessionsRepository.save(session);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['role'],
    });
    if (!user || user.deletedAt || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is not active');
    }

    session.revokedAt = new Date();
    await this.sessionsRepository.save(session);

    const tokens = await this.issueTokens(user, meta);

    return {
      message: 'Token refreshed successfully',
      data: { tokens },
    };
  }

  async logout(sessionId: string, userId: string) {
    await this.sessionsRepository.update(
      { id: sessionId, userId },
      { revokedAt: new Date() },
    );
    this.logger.log(`Session revoked: ${sessionId} (user ${userId})`);
    return { message: 'Logout successful', data: null };
  }

  async logoutAllDevices(userId: string) {
    await this.sessionsRepository
      .createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
    this.logger.log(`All sessions revoked for user ${userId}`);
    return { message: 'Logged out from all devices', data: null };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.emailVerificationsRepository.findOne({
      where: { tokenHash },
    });

    if (!record || record.verifiedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Verification link is invalid or expired');
    }

    record.verifiedAt = new Date();
    await this.emailVerificationsRepository.save(record);

    const user = await this.usersRepository.findOne({
      where: { id: record.userId },
    });
    if (user) {
      user.emailVerifiedAt = new Date();
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        user.status = UserStatus.ACTIVE;
      }
      await this.usersRepository.save(user);
    }

    return { message: 'Email verified successfully', data: null };
  }

  async resendVerification(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.emailVerifiedAt) {
      return {
        message:
          'If the account exists and is unverified, a new link has been sent',
        data: null,
      };
    }

    await this.issueEmailVerification(user);
    return {
      message:
        'If the account exists and is unverified, a new link has been sent',
      data: null,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.deletedAt) {
      return {
        message: 'If the account exists, a password reset link has been sent',
        data: null,
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const record = this.passwordResetsRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });
    await this.passwordResetsRepository.save(record);
    await this.mailerService.sendPasswordResetEmail(user.email, rawToken);

    return {
      message: 'If the account exists, a password reset link has been sent',
      data: null,
    };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.passwordResetsRepository.findOne({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    const user = await this.usersRepository.findOne({
      where: { id: record.userId },
    });
    if (!user || user.deletedAt) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);

    record.usedAt = new Date();
    await this.passwordResetsRepository.save(record);

    await this.sessionsRepository
      .createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('revoked_at IS NULL')
      .execute();

    this.logger.log(`Password reset completed for user ${user.id}`);
    return { message: 'Password has been reset successfully', data: null };
  }

  private async issueEmailVerification(user: User) {
    const rawToken = randomBytes(32).toString('hex');
    const record = this.emailVerificationsRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });
    await this.emailVerificationsRepository.save(record);
    await this.mailerService.sendVerificationEmail(user.email, rawToken);
  }

  private async issueTokens(user: User, meta: RequestMeta) {
    const sessionId = randomUUID();
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'jwt.accessExpiresIn',
    );
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );
    const roleName = user.role?.name ?? RoleEnum.USER;

    const basePayload = {
      sub: user.id,
      email: user.email,
      role: roleName,
      sid: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, type: 'access' as const },
        {
          secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
          expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      ),
      this.jwtService.signAsync(
        { ...basePayload, type: 'refresh' as const },
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      ),
    ]);

    const session = this.sessionsRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + this.parseDurationMs(refreshExpiresIn)),
    });
    await this.sessionsRepository.save(session);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/i.exec(duration.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    return value * (multipliers[unit] ?? 86400000);
  }
}
