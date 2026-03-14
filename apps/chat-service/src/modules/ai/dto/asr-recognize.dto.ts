import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AsrRecognizeDto {
  @ApiProperty({ description: 'base64 编码的音频数据' })
  @IsString()
  audioData: string;

  @ApiProperty({ description: '音频格式，如 webm、wav、mp3' })
  @IsString()
  format: string;

  @ApiProperty({ description: '音频原始字节长度' })
  @IsNumber()
  dataLen: number;

  @ApiProperty({ description: '引擎类型，默认 16k_zh', required: false })
  @IsOptional()
  @IsString()
  engSerViceType?: string;
}
