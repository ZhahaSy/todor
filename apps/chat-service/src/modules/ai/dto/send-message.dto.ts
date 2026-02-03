import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: '用户输入内容',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString()
  @MinLength(1, { message: '输入内容不能为空' })
  @MaxLength(10000, { message: '输入内容不能超过10000个字符' })
  readonly input: string;

  @ApiProperty({ description: '用户年龄', required: false })
  @IsOptional()
  @IsNumber()
  readonly age?: number;

  @ApiProperty({
    description: '用户性别',
    enum: ['男', '女', '其他'],
    required: false,
  })
  @IsOptional()
  @IsIn(['男', '女', '其他'])
  readonly gender?: string;

  @ApiProperty({ description: '用户爱好', required: false })
  @IsOptional()
  @IsString()
  readonly hobby?: string;
}
