import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportOpenApiDto {
  @ApiPropertyOptional({ description: 'OpenAPI spec 的 URL（与 specContent 二选一）' })
  @IsOptional()
  @IsString()
  specUrl?: string;

  @ApiPropertyOptional({ description: 'OpenAPI spec 内容（JSON 或 YAML 字符串，与 specUrl 二选一）' })
  @IsOptional()
  @IsString()
  specContent?: string;
}
