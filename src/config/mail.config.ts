// src/config/mail.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: ['true', '1', 'yes'].includes(
    (process.env.SMTP_SECURE || 'false').toLowerCase(),
  ),
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
  fromName: process.env.MAIL_FROM_NAME || 'App',
  fromEmail: process.env.MAIL_FROM_EMAIL,
  frontendUrl: process.env.APP_FRONTEND_URL || 'http://localhost:5173',
}));
