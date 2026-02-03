import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { encryptPassword } from '@/utils/cryptogram';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from './dto/login.dto';
import {
  NotFoundUser,
  Success,
  UserOrPasswordError,
} from '@/common/constants/statusCode';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
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

  async getUserList() {
    return await this.userRepository.find({
      order: { id: 'DESC' },
    });
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
}
