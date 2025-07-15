import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { encryptPassword } from 'src/utils/cryptogram';
import { jwtConstants } from './constants';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(userName: string, password: string): Promise<any> {
    const user = await this.usersService.findOne({ userName });

    if (user) {
      const hashedPwd = user.hashPwd;
      const salt = user.salt;

      const newHashPwd = encryptPassword(password, salt);
      if (hashedPwd === newHashPwd) {
        return {
          code: 1,
          user,
        };
      } else {
        return {
          code: 2,
          user: null,
        };
      }
    }
    return { code: 3, user: null };
  }

  async certificate(user: any) {
    const payload = {
      username: user.userName,
      sub: user.id,
      realName: user.realName,
      role: user.role,
    };

    try {
      const token = this.jwtService.sign(payload, {
        secret: jwtConstants.secret,
      });
      return {
        code: 200,
        data: {
          token,
        },
        message: 'success',
      };
    } catch (error) {
      return {
        code: 600,
        message: '账号或密码错误',
      };
    }
  }
}
