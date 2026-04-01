import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertDeepDiveExtraDto {
  @ApiProperty({ description: '深入会话 ID（与 URL session 一致）' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  readonly sessionId: string;

  /** 可省略或空串；客户端 JSON 常省略 undefined 字段，故必须可选 */
  @ApiProperty({ description: '追加文本内容', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  readonly extraContext?: string;
}
