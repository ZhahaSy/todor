import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResOp } from '@/common/model/response.model';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/create')
  async create(@Body() createUserDto: CreateUserDto) {
    return ResOp.success(await this.userService.create(createUserDto));
  }
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.userService.login(loginDto);

    // 如果登录成功，将 token 设置到 Cookie
    if (result.code === 0 && 'data' in result && result.data?.token) {
      res.cookie('token', result.data.token, {
        httpOnly: true, // 防止 XSS 攻击
        secure: process.env.COOKIE_SECURE === 'true', // 仅 HTTPS 时开启
        sameSite: 'lax', // 防止 CSRF 攻击
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
        path: '/',
      });
    }

    return result;
  }
  @UseGuards(JwtAuthGuard)
  @Get('/info')
  async info(@Request() req) {
    return ResOp.success(
      await this.userService.findOne({ id: req.user.userId }),
    );
  }

  /**
   * 更新用户信息
   */
  @UseGuards(JwtAuthGuard)
  @Put('/update')
  async updateUserInfo(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.updateUserInfo(
      req.user.userId,
      updateUserDto,
    );
  }

  /**
   * 修改密码
   */
  @UseGuards(JwtAuthGuard)
  @Post('/change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.userService.changePassword(
      req.user.userId,
      changePasswordDto,
    );
  }

  /**
   * 导出用户数据
   */
  @UseGuards(JwtAuthGuard)
  @Get('/export-data')
  async exportUserData(@Request() req) {
    return await this.userService.exportUserData(req.user.userId);
  }
}
