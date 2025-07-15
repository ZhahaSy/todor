import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResOp } from '@/common/model/response.model';
import { LoginDto } from './dto/login.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/create')
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Get('/list')
  async getTodoList() {
    return ResOp.success(await this.userService.getUserList());
  }
  @Get('/findOne')
  async findOne(@Query('id') id: number) {
    return ResOp.success(await this.userService.findOne(id));
  }
  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    return ResOp.success(await this.userService.login(loginDto));
  }
}
