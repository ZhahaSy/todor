import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { encryptPassword } from 'src/utils/cryptogram';
import { jwtConstants } from './constants';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ResOp } from '@/common/model/response.model';
import {
  NotFoundUser,
  UserOrPasswordError,
} from '@/common/constants/statusCode';

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
    const user = await this.usersService.findOne({ name: userName });

    if (user) {
      const hashedPwd = user.hashPwd;
      const salt = user.salt;

      const newHashPwd = encryptPassword(password, salt);

      if (hashedPwd === newHashPwd) {
        return ResOp.success(user, '验证成功');
      } else {
        return ResOp.error(UserOrPasswordError, '账号或密码错误');
      }
    }
    return ResOp.error(NotFoundUser, '账号或密码错误');
  }

  async certificate(user: Partial<User>) {
    const payload = {
      username: user.name,
      sub: user.id,
    };

    const token = await this.jwtService.sign(payload, {
      secret: jwtConstants.secret,
    });
    return ResOp.success<{ token: string }>({
      token,
    });
  }
}
