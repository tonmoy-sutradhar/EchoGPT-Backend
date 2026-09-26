// src/modules/mailer/mailer.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter!: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('mail.host'),
      port: this.configService.getOrThrow<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure') ?? false,
      auth: {
        user: this.configService.getOrThrow<string>('mail.user'),
        pass: this.configService.getOrThrow<string>('mail.password'),
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`SMTP connection failed: ${error.message}`);
      } else {
        this.logger.log('SMTP connection established successfully');
      }
    });
  }

  async sendVerificationEmail(email: string, rawToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('mail.frontendUrl');
    const verificationLink = `${frontendUrl}/verify-email?token=${rawToken}`;
    const fromName = this.configService.get<string>('mail.fromName');
    const fromEmail = this.configService.getOrThrow<string>('mail.fromEmail');

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: 'Verify your email address',
        html: this.buildVerificationTemplate(verificationLink),
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  async sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('mail.frontendUrl');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    const fromName = this.configService.get<string>('mail.fromName');
    const fromEmail = this.configService.getOrThrow<string>('mail.fromEmail');

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: 'Reset your password',
        html: this.buildResetTemplate(resetLink),
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send reset email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  private buildVerificationTemplate(link: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Thanks for signing up. Please confirm your email address by clicking the button below.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;
             border-radius:6px;text-decoration:none;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p style="word-break: break-all; color: #555;">${link}</p>
        <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      </div>
    `;
  }

  private buildResetTemplate(link: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#dc2626;color:#fff;padding:12px 24px;
             border-radius:6px;text-decoration:none;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p style="word-break: break-all; color: #555;">${link}</p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
  }
}
