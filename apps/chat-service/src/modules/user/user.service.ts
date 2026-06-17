import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { encryptPassword, verifyPassword } from '@/utils/cryptogram';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  NotFoundUser,
  Success,
  UserOrPasswordError,
} from '@/common/constants/statusCode';
import { ResOp } from '@/common/model/response.model';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => require('../auth/auth.service').AuthService))
    private readonly authService: any,
  ) {}

  async create(createUserDto: Partial<CreateUserDto>) {
    const { password } = createUserDto;

    try {
      // 使用 Argon2 加密密码（自动处理盐值）
      const hashPwd = await encryptPassword(password);
      const newUser = this.userRepository.create({
        ...createUserDto,
        hashPwd,
        salt: '', // Argon2 不需要单独的盐值字段
      });
      return await this.userRepository.save(newUser);
    } catch (error) {
      this.logger.error(`创建用户失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(params: Partial<User>) {
    return await this.userRepository.findOne({
      where: {
        ...params,
      },
    });
  }

  async delete(id) {
    return await this.userRepository.update(id, {
      deleted: true,
    });
  }

  async login(loginDto: LoginDto) {
    const authResult = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    this.logger.log(
      `用户 ${loginDto.username} 登录验证结果: ${loginDto}`,
      authResult,
    );

    switch (authResult.code) {
      case Success:
        return await this.authService.certificate(authResult.data);
      case UserOrPasswordError:
        return {
          code: UserOrPasswordError,
          msg: `账号或密码不正确`,
        };
      default:
        return {
          code: NotFoundUser,
          msg: `查无此人`,
        };
    }
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userId: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        return ResOp.error(NotFoundUser, '用户不存在');
      }

      // 如果更新邮箱，检查邮箱是否已被使用
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateUserDto.email },
        });

        if (existingUser && existingUser.id !== userId) {
          return ResOp.error(UserOrPasswordError, '该邮箱已被使用');
        }
      }

      // 更新用户信息
      await this.userRepository.update(userId, updateUserDto);

      // 返回更新后的用户信息
      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
      });

      this.logger.log(`用户 ${userId} 更新了个人信息`);

      return ResOp.success(updatedUser, '更新成功');
    } catch (error) {
      this.logger.error(`更新用户信息失败: ${error.message}`, error.stack);
      return ResOp.error(500, '更新失败');
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    try {
      const { oldPassword, newPassword, confirmPassword } = changePasswordDto;

      // 验证新密码和确认密码是否一致
      if (newPassword !== confirmPassword) {
        return ResOp.error(UserOrPasswordError, '两次输入的密码不一致');
      }

      // 查询用户（hashPwd 为 select:false，校验旧密码需显式选取）
      const user = await this.userRepository
        .createQueryBuilder('u')
        .addSelect('u.hashPwd')
        .where('u.id = :userId', { userId })
        .getOne();

      if (!user) {
        return ResOp.error(NotFoundUser, '用户不存在');
      }

      // 验证旧密码
      const isValidPassword = await verifyPassword(oldPassword, user.hashPwd);

      if (!isValidPassword) {
        return ResOp.error(UserOrPasswordError, '旧密码错误');
      }

      // 加密新密码
      const newHashPwd = await encryptPassword(newPassword);

      // 更新密码
      await this.userRepository.update(userId, {
        hashPwd: newHashPwd,
        salt: '', // Argon2 不需要盐值
      });

      this.logger.log(`用户 ${userId} 修改了密码`);

      return ResOp.success(null, '密码修改成功');
    } catch (error) {
      this.logger.error(`修改密码失败: ${error.message}`, error.stack);
      return ResOp.error(500, '密码修改失败');
    }
  }

  /**
   * 导出用户数据
   */
  async exportUserData(userId: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        return ResOp.error(NotFoundUser, '用户不存在');
      }

      // 移除敏感信息
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashPwd, salt, deleted, ...userData } = user;

      return ResOp.success(userData, '导出成功');
    } catch (error) {
      this.logger.error(`导出用户数据失败: ${error.message}`, error.stack);
      return ResOp.error(500, '导出失败');
    }
  }
}
