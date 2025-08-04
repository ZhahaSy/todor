import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: '用户输入内容' })
  @IsString()
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
