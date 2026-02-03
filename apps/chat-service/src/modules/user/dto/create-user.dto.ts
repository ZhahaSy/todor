import {
  IsString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2, { message: '用户名至少需要2个字符' })
  @MaxLength(255, { message: '用户名不能超过255个字符' })
  readonly name: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号' })
  readonly phone: string;

  @ApiProperty({ description: '性别', enum: ['male', 'female'] })
  @IsEnum(['male', 'female'], { message: '性别必须是 male 或 female' })
  readonly gender: 'male' | 'female';

  @ApiProperty({ description: '年龄', minimum: 1, maximum: 150 })
  @IsNumber()
  @Min(1, { message: '年龄必须大于0' })
  @Max(150, { message: '年龄不能超过150' })
  readonly age: number;

  @ApiProperty({ description: '工作', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '工作描述不能超过255个字符' })
  readonly job?: string;

  @ApiProperty({ description: '公司地址', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '公司地址不能超过255个字符' })
  readonly work_address?: string;

  @ApiProperty({ description: '居住地', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '居住地不能超过255个字符' })
  readonly address?: string;

  @ApiProperty({ description: '爱好', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '爱好不能超过255个字符' })
  readonly hobby?: string;

  @ApiProperty({ description: '生活作息表', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '生活作息表不能超过255个字符' })
  readonly life_routine?: string;

  @ApiProperty({ description: '密码', minLength: 6, maxLength: 255 })
  @IsString()
  @MinLength(6, { message: '密码至少需要6个字符' })
  @MaxLength(255, { message: '密码不能超过255个字符' })
  readonly password: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  readonly email: string;
}
