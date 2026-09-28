// // src/modules/users/users.controller.ts
// import {
//   Controller,
//   Get,
//   Patch,
//   Delete,
//   Param,
//   Body,
//   Query,
//   ParseUUIDPipe,
//   HttpCode,
//   HttpStatus,
// } from '@nestjs/common';
// import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { UsersService } from './users.service';
// import { UpdateProfileDto } from './dto/update-profile.dto';
// import { ChangePasswordDto } from './dto/change-password.dto';
// import { DeleteAccountDto } from './dto/delete-account.dto';
// import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
// import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
// import { Roles, CurrentUser } from '../../common/decorators';
// import { Role } from '../../common/enums/role.enum';
// import type { AuthenticatedUser } from '../../common/interfaces';
// import {
//   ApiSuccess,
//   ApiProtectedErrors,
//   ApiForbidden,
//   ApiNotFound,
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

// @ApiTags('Users')
// @ApiBearerAuth('access-token')
// @ApiProtectedErrors()
// @Controller({ path: 'users', version: '1' })
// export class UsersController {
//   constructor(private readonly usersService: UsersService) {}

//   // ---------- Self-service ----------

//   @Get('me')
//   @ApiOperation({ summary: 'Get current user profile' })
//   @ApiSuccess({
//     description: 'Current user profile',
//     message: 'Profile fetched successfully',
//     data: userExample,
//   })
//   async getProfile(@CurrentUser() user: AuthenticatedUser) {
//     const profile = await this.usersService.getProfile(user.id);
//     return {
//       message: 'Profile fetched successfully',
//       data: this.usersService.toResponse(profile),
//     };
//   }

//   @Patch('me')
//   @ApiOperation({
//     summary: 'Update current user profile',
//     description:
//       'Only `fullName` and `avatarUrl` can be changed. Both are optional.',
//   })
//   @ApiSuccess({
//     description: 'Profile updated',
//     message: 'Profile updated successfully',
//     data: {
//       ...userExample,
//       fullName: 'Jane Doe',
//       avatarUrl: 'https://example.com/avatar.png',
//     },
//   })
//   async updateProfile(
//     @CurrentUser() user: AuthenticatedUser,
//     @Body() dto: UpdateProfileDto,
//   ) {
//     const updated = await this.usersService.updateProfile(user.id, dto);
//     return {
//       message: 'Profile updated successfully',
//       data: this.usersService.toResponse(updated),
//     };
//   }

//   @Patch('me/password')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Change current user password',
//     description:
//       'Requires the current password. All sessions are revoked, so the user must log in again.',
//   })
//   @ApiSuccess({
//     description: 'Password changed; all sessions revoked',
//     message: 'Password changed successfully. Please log in again.',
//   })
//   @ApiUnauthorized('Access token invalid, or current password is incorrect')
//   async changePassword(
//     @CurrentUser() user: AuthenticatedUser,
//     @Body() dto: ChangePasswordDto,
//   ) {
//     await this.usersService.changePassword(user.id, dto);
//     return {
//       message: 'Password changed successfully. Please log in again.',
//       data: null,
//     };
//   }

//   @Delete('me')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Delete current user account',
//     description:
//       'Soft delete. Requires the current password. All sessions are revoked.',
//   })
//   @ApiSuccess({
//     description: 'Account deleted',
//     message: 'Account deleted successfully',
//   })
//   @ApiUnauthorized('Access token invalid, or password is incorrect')
//   async deleteOwnAccount(
//     @CurrentUser() user: AuthenticatedUser,
//     @Body() dto: DeleteAccountDto,
//   ) {
//     await this.usersService.deleteOwnAccount(user.id, dto.password);
//     return { message: 'Account deleted successfully', data: null };
//   }

//   // ---------- Admin ----------

//   @Get()
//   @Roles(Role.ADMIN)
//   @ApiOperation({
//     summary: 'List users (Admin only)',
//     description: 'Paginated. Use `search` to filter by name or email.',
//   })
//   @ApiSuccess({
//     description: 'Paginated users',
//     message: 'Users fetched successfully',
//     data: {
//       items: [userExample],
//       meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
//     },
//   })
//   @ApiForbidden('Admin role required')
//   async findAll(@Query() query: PaginationQueryDto) {
//     const result = await this.usersService.findAllPaginated(query);
//     return {
//       message: 'Users fetched successfully',
//       data: {
//         items: result.items.map((u) => this.usersService.toResponse(u)),
//         meta: result.meta,
//       },
//     };
//   }

//   @Get(':id')
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Get user by ID (Admin only)' })
//   @ApiSuccess({
//     description: 'User details',
//     message: 'User fetched successfully',
//     data: userExample,
//   })
//   @ApiForbidden('Admin role required')
//   @ApiNotFound('User not found')
//   async findOne(@Param('id', ParseUUIDPipe) id: string) {
//     const user = await this.usersService.findById(id);
//     return {
//       message: 'User fetched successfully',
//       data: this.usersService.toResponse(user),
//     };
//   }

//   @Patch(':id')
//   @Roles(Role.ADMIN)
//   @ApiOperation({
//     summary: 'Update user name, role or status (Admin only)',
//     description:
//       'Suspending a user revokes all their sessions. Status `deleted` is not allowed here; use DELETE instead.',
//   })
//   @ApiSuccess({
//     description: 'User updated',
//     message: 'User updated successfully',
//     data: { ...userExample, role: 'admin', status: 'suspended' },
//   })
//   @ApiForbidden('Admin role required')
//   @ApiNotFound('User not found')
//   async update(
//     @Param('id', ParseUUIDPipe) id: string,
//     @Body() dto: AdminUpdateUserDto,
//   ) {
//     const user = await this.usersService.adminUpdate(id, dto);
//     return {
//       message: 'User updated successfully',
//       data: this.usersService.toResponse(user),
//     };
//   }

//   @Delete(':id')
//   @Roles(Role.ADMIN)
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({
//     summary: 'Delete a user (Admin only)',
//     description: 'Soft delete. All sessions of that user are revoked.',
//   })
//   @ApiSuccess({
//     description: 'User deleted',
//     message: 'User deleted successfully',
//   })
//   @ApiForbidden('Admin role required')
//   @ApiNotFound('User not found')
//   async remove(@Param('id', ParseUUIDPipe) id: string) {
//     await this.usersService.adminDelete(id);
//     return { message: 'User deleted successfully', data: null };
//   }
// }

// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ description: 'Current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.getProfile(user.id);
    return {
      message: 'Profile fetched successfully',
      data: this.usersService.toResponse(profile),
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return {
      message: 'Profile updated successfully',
      data: this.usersService.toResponse(updated),
    };
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiOkResponse({ description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.id, dto);
    return {
      message: 'Password changed successfully. Please log in again.',
      data: null,
    };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user account (soft delete)' })
  @ApiOkResponse({ description: 'Account deleted successfully' })
  async deleteOwnAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.usersService.deleteOwnAccount(user.id, dto.password);
    return { message: 'Account deleted successfully', data: null };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users with pagination (Admin only)' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.usersService.findAllPaginated(query);
    return {
      message: 'Users fetched successfully',
      data: {
        items: result.items.map((u) => this.usersService.toResponse(u)),
        meta: result.meta,
      },
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    return {
      message: 'User fetched successfully',
      data: this.usersService.toResponse(user),
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user role/status/name (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    const user = await this.usersService.adminUpdate(id, dto);
    return {
      message: 'User updated successfully',
      data: this.usersService.toResponse(user),
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user account (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.adminDelete(id);
    return { message: 'User deleted successfully', data: null };
  }
}
