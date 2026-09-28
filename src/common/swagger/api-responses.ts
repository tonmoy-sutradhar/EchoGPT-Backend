// src/common/swagger/api-responses.ts
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['email must be an email'],
  })
  errors?: unknown[];

  @ApiProperty({ example: '2026-09-28T10:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  path!: string;
}

interface SuccessOptions {
  status?: HttpStatus;
  description: string;
  message: string;
  data?: unknown;
}

/** Documents the standard success envelope: { success, statusCode, message, data } */
export const ApiSuccess = ({
  status = HttpStatus.OK,
  description,
  message,
  data = null,
}: SuccessOptions) =>
  ApiResponse({
    status,
    description,
    schema: {
      example: { success: true, statusCode: status, message, data },
    },
  });

const errorResponse = (status: HttpStatus, description: string) =>
  ApiResponse({ status, description, type: ErrorResponseDto });

export const ApiBadRequest = (
  description = 'Validation failed or invalid input',
) => errorResponse(HttpStatus.BAD_REQUEST, description);

export const ApiUnauthorized = (
  description = 'Missing, invalid or expired access token',
) => errorResponse(HttpStatus.UNAUTHORIZED, description);

export const ApiForbidden = (
  description = 'Insufficient permissions (role or plan limit)',
) => errorResponse(HttpStatus.FORBIDDEN, description);

export const ApiNotFound = (description = 'Resource not found') =>
  errorResponse(HttpStatus.NOT_FOUND, description);

export const ApiConflict = (description = 'Resource already exists') =>
  errorResponse(HttpStatus.CONFLICT, description);

export const ApiTooManyRequests = () =>
  errorResponse(HttpStatus.TOO_MANY_REQUESTS, 'Rate limit exceeded');

/** Errors that can happen on any protected endpoint. Use at controller level. */
export const ApiProtectedErrors = () =>
  applyDecorators(
    ApiBadRequest(),
    ApiUnauthorized(),
    ApiTooManyRequests(),
    errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected server error'),
  );

/** Errors that can happen on any public endpoint. Use at controller level. */
export const ApiPublicErrors = () =>
  applyDecorators(
    ApiBadRequest(),
    ApiTooManyRequests(),
    errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected server error'),
  );
