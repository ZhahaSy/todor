import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ description: 'Tool 名称（snake_case，同一用户唯一）' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '展示名' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: 'LLM 决策描述，越详细越准确' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: '触发关键词 JSON 数组字符串', default: '[]' })
  @IsString()
  @IsOptional()
  triggerKeywords?: string;

  @ApiPropertyOptional({ description: 'skill 类型', enum: ['webhook', 'flow'], default: 'webhook' })
  @IsIn(['webhook', 'flow'])
  @IsOptional()
  type?: 'webhook' | 'flow';

  @ApiPropertyOptional({ description: '执行类型', enum: ['single', 'flow'], default: 'single' })
  @IsIn(['single', 'flow'])
  @IsOptional()
  executionType?: 'single' | 'flow';

  @ApiProperty({ description: 'JSON 配置：{ url, method?, headers?, timeout? }' })
  @IsString()
  @IsNotEmpty()
  config: string;

  @ApiPropertyOptional({ description: 'JSON Schema 描述入参结构', default: '{}' })
  @IsString()
  @IsOptional()
  inputSchema?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
