import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { makeSalt, encryptPassword } from '@/utils/cryptogram';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}
  async create(createUserDto: Partial<CreateUserDto>) {
    const { password } = createUserDto;
    const salt = makeSalt();
    const hashPwd = encryptPassword(password, salt);
    const newUser = await this.userRepository.create({
      ...createUserDto,
      salt,
      hashPwd,
    });
    return await this.userRepository.save(newUser);
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
      case 1:
        return await this.authService.certificate(authResult.user);
      case 2:
        return {
          code: 600,
          msg: `账号或密码不正确`,
        };
      default:
        return {
          code: 600,
          msg: `查无此人`,
        };
    }
  }
}
