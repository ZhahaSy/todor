import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({ description: '纬度' })
  @IsNumber()
  readonly lat: number;

  @ApiProperty({ description: '经度' })
  @IsNumber()
  readonly lon: number;
}

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

  @ApiProperty({ description: '对话模式', enum: ['chat', 'todo'], required: false })
  @IsOptional()
  @IsIn(['chat', 'todo'])
  readonly mode?: string;

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

  @ApiProperty({
    description: '用户位置（经纬度），用于天气查询精确定位',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  readonly location?: LocationDto;
}
