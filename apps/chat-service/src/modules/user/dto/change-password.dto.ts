import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: '旧密码长度不能小于 6' })
  oldPassword: string;

  @IsString()
  @MinLength(6, { message: '新密码长度不能小于 6' })
  newPassword: string;

  @IsString()
  @MinLength(6, { message: '确认密码长度不能小于 6' })
  confirmPassword: string;
}
