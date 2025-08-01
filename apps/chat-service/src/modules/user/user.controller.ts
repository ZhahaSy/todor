import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
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
  @UseGuards(JwtAuthGuard)
  @Get('/list')
  async getTodoList() {
    return ResOp.success(await this.userService.getUserList());
  }
  @UseGuards(JwtAuthGuard)
  @Get('/findOne')
  async findOne(@Query('id') id: string) {
    return ResOp.success(await this.userService.findOne({ id }));
  }
  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.userService.login(loginDto);
    return result;
  }
}
