import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2, { message: '用户名至少需要2个字符' })
  @MaxLength(255, { message: '用户名不能超过255个字符' })
  username: string;

  @ApiProperty({ description: '密码', minLength: 6, maxLength: 255 })
  @IsString()
  @MinLength(6, { message: '密码至少需要6个字符' })
  @MaxLength(255, { message: '密码不能超过255个字符' })
  password: string;
}
