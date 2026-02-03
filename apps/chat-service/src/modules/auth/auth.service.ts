import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword, encryptPassword } from 'src/utils/cryptogram';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ResOp } from '@/common/model/response.model';
import {
  NotFoundUser,
  UserOrPasswordError,
} from '@/common/constants/statusCode';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 验证用户密码
   * 支持新旧两种加密算法，自动迁移旧密码到 Argon2
   */
  async validateUser(userName: string, password: string): Promise<any> {
    const user = await this.usersService.findOne({ name: userName });

    if (!user) {
      return ResOp.error(NotFoundUser, '账号或密码错误');
    }

    try {
      // 尝试使用 Argon2 验证（新密码格式）
      const isArgon2Valid = await verifyPassword(password, user.hashPwd);

      if (isArgon2Valid) {
        this.logger.debug(`用户 ${userName} 使用 Argon2 密码登录成功`);
        return ResOp.success(user, '验证成功');
      }

      // Argon2 验证失败，尝试使用旧算法验证（兼容旧用户）
      if (user.salt && user.salt.length > 0) {
        this.logger.debug(`尝试使用旧加密算法验证用户 ${userName}`);
        const legacyHash = this.legacyEncryptPassword(password, user.salt);

        if (user.hashPwd === legacyHash) {
          // 旧密码验证成功，自动迁移到 Argon2
          this.logger.log(`✅ 用户 ${userName} 使用旧密码登录成功，开始迁移到 Argon2`);

          const newHash = await encryptPassword(password);
          await this.userRepository.update(user.id, {
            hashPwd: newHash,
            salt: '', // 清空盐值，Argon2 不需要
          });

          this.logger.log(`✅ 用户 ${userName} 的密码已成功迁移到 Argon2`);

          // 更新用户对象中的密码哈希，避免下次还要迁移
          user.hashPwd = newHash;
          user.salt = '';

          return ResOp.success(user, '验证成功');
        }
      }

      return ResOp.error(UserOrPasswordError, '账号或密码错误');
    } catch (error) {
      this.logger.error(`密码验证失败: ${error.message}`, error.stack);
      return ResOp.error(UserOrPasswordError, '账号或密码错误');
    }
  }

  /**
   * 旧的密码加密方法（仅用于验证旧密码）
   * @deprecated 仅用于向后兼容，新密码使用 Argon2
   */
  private legacyEncryptPassword(password: string, salt: string): string {
    if (!password || !salt) {
      return '';
    }
    const tempSalt = Buffer.from(salt, 'base64');
    return crypto
      .pbkdf2Sync(password, Uint8Array.from(tempSalt), 10000, 16, 'sha1')
      .toString('base64');
  }

  async certificate(user: Partial<User>) {
    const payload = {
      username: user.name,
      sub: user.id,
      // 添加更多用户信息到 JWT payload，减少后续查询
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      hobby: user.hobby,
    };

    this.logger.debug(`生成JWT令牌: ${JSON.stringify(payload)}`);

    const token = await this.jwtService.sign(payload);
    return ResOp.success<{ token: string }>({
      token,
    });
  }
}
