// src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Session } from '../auth/entities/session.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { hashPassword, comparePassword } from '../../common/utils';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['role'],
    });
  }

  async getProfile(userId: string): Promise<User> {
    return this.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    return this.usersRepository.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findById(userId);
    const isValid = await comparePassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await hashPassword(dto.newPassword);
    await this.usersRepository.save(user);
    await this.revokeAllSessions(userId);
    this.logger.log(`Password changed for user ${userId}`);
  }

  async deleteOwnAccount(userId: string, password: string): Promise<void> {
    const user = await this.findById(userId);
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Password is incorrect');
    }
    await this.softDelete(user);
    this.logger.log(`User self-deleted: ${userId}`);
  }

  async findAllPaginated(query: PaginationQueryDto) {
    const { page, limit, search } = query;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.deleted_at IS NULL')
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(user.full_name ILIKE :search OR user.email ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.fullName !== undefined) user.fullName = dto.fullName;

    if (dto.role !== undefined) {
      const role = await this.rolesRepository.findOne({
        where: { name: dto.role },
      });
      if (!role) {
        throw new BadRequestException(`Role "${dto.role}" does not exist`);
      }
      user.roleId = role.id;
      user.role = role;
    }

    if (dto.status !== undefined) {
      if (dto.status === UserStatus.DELETED) {
        throw new BadRequestException(
          'Use the delete endpoint to remove a user, not a status update',
        );
      }
      user.status = dto.status;
      if (dto.status === UserStatus.SUSPENDED) {
        await this.revokeAllSessions(user.id);
      }
    }

    return this.usersRepository.save(user);
  }

  async adminDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.softDelete(user);
    this.logger.log(`User deleted by admin: ${id}`);
  }

  private async softDelete(user: User): Promise<void> {
    user.status = UserStatus.DELETED;
    user.deletedAt = new Date();
    await this.usersRepository.save(user);
    await this.revokeAllSessions(user.id);
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionsRepository
      .createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  toResponse(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role?.name,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

// // src/modules/users/users.service.ts
// import {
//   Injectable,
//   NotFoundException,
//   ConflictException,
//   Logger,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from './entities/user.entity';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { hashPassword } from '../../common/utils';
// import { Role } from '../../common/enums/role.enum';

// @Injectable()
// export class UsersService {
//   private readonly logger = new Logger(UsersService.name);

//   constructor(
//     @InjectRepository(User)
//     private readonly usersRepository: Repository<User>,
//   ) {}

//   async create(createUserDto: CreateUserDto): Promise<User> {
//     const existing = await this.usersRepository.findOne({
//       where: { email: createUserDto.email.toLowerCase() },
//     });

//     if (existing) {
//       throw new ConflictException('Email is already registered');
//     }

//     const user = this.usersRepository.create({
//       name: createUserDto.name,
//       email: createUserDto.email.toLowerCase(),
//       password: await hashPassword(createUserDto.password),
//       role: createUserDto.role ?? Role.USER,
//     });

//     const saved = await this.usersRepository.save(user);
//     this.logger.log(`User created: ${saved.id}`);
//     return saved;
//   }

//   async findAll(): Promise<User[]> {
//     return this.usersRepository.find({
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async findById(id: string): Promise<User> {
//     const user = await this.usersRepository.findOne({ where: { id } });
//     if (!user) {
//       throw new NotFoundException('User not found');
//     }
//     return user;
//   }

//   async findByEmail(email: string): Promise<User | null> {
//     return this.usersRepository.findOne({
//       where: { email: email.toLowerCase() },
//     });
//   }

//   async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
//     const user = await this.findById(id);

//     if (updateUserDto.email && updateUserDto.email !== user.email) {
//       const existing = await this.findByEmail(updateUserDto.email);
//       if (existing && existing.id !== id) {
//         throw new ConflictException('Email is already registered');
//       }
//       user.email = updateUserDto.email.toLowerCase();
//     }

//     if (updateUserDto.name !== undefined) {
//       user.name = updateUserDto.name;
//     }
//     if (updateUserDto.role !== undefined) {
//       user.role = updateUserDto.role;
//     }
//     if (updateUserDto.isActive !== undefined) {
//       user.isActive = updateUserDto.isActive;
//     }

//     return this.usersRepository.save(user);
//   }

//   async remove(id: string): Promise<void> {
//     const user = await this.findById(id);
//     await this.usersRepository.remove(user);
//     this.logger.log(`User removed: ${id}`);
//   }

//   toResponse(user: User) {
//     return {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       isActive: user.isActive,
//       createdAt: user.createdAt,
//       updatedAt: user.updatedAt,
//     };
//   }
// }
