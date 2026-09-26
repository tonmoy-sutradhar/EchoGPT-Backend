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

// // src/modules/users/users.controller.ts
// import {
//   Controller,
//   Get,
//   Patch,
//   Delete,
//   Param,
//   Body,
//   ParseUUIDPipe,
//   HttpCode,
//   HttpStatus,
// } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiOperation,
//   ApiTags,
//   ApiOkResponse,
// } from '@nestjs/swagger';
// import { UsersService } from './users.service';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { Roles, CurrentUser } from '../../common/decorators';
// import { Role } from '../../common/enums/role.enum';
// import type { AuthenticatedUser } from '../../common/interfaces';

// @ApiTags('Users')
// @ApiBearerAuth('access-token')
// @Controller({ path: 'users', version: '1' })
// export class UsersController {
//   constructor(private readonly usersService: UsersService) {}

//   @Get('me')
//   @ApiOperation({ summary: 'Get current authenticated user profile' })
//   @ApiOkResponse({ description: 'Current user profile' })
//   async getProfile(@CurrentUser() user: AuthenticatedUser) {
//     const profile = await this.usersService.findById(user.id);
//     return {
//       message: 'Profile fetched successfully',
//       data: this.usersService.toResponse(profile),
//     };
//   }

//   @Get()
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'List all users (Admin only)' })
//   async findAll() {
//     const users = await this.usersService.findAll();
//     return {
//       message: 'Users fetched successfully',
//       data: users.map((user) => this.usersService.toResponse(user)),
//     };
//   }

//   @Get(':id')
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Get user by ID (Admin only)' })
//   async findOne(@Param('id', ParseUUIDPipe) id: string) {
//     const user = await this.usersService.findById(id);
//     return {
//       message: 'User fetched successfully',
//       data: this.usersService.toResponse(user),
//     };
//   }

//   @Patch(':id')
//   @Roles(Role.ADMIN)
//   @ApiOperation({ summary: 'Update user (Admin only)' })
//   async update(
//     @Param('id', ParseUUIDPipe) id: string,
//     @Body() updateUserDto: UpdateUserDto,
//   ) {
//     const user = await this.usersService.update(id, updateUserDto);
//     return {
//       message: 'User updated successfully',
//       data: this.usersService.toResponse(user),
//     };
//   }

//   @Delete(':id')
//   @Roles(Role.ADMIN)
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Delete user (Admin only)' })
//   async remove(@Param('id', ParseUUIDPipe) id: string) {
//     await this.usersService.remove(id);
//     return {
//       message: 'User deleted successfully',
//       data: null,
//     };
//   }
// }
