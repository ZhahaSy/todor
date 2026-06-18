import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ResOp } from '@/common/model/response.model';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { AdminGuard } from '@/common/guard/admin.guard';
import { AiQuotaService } from './ai-quota.service';

/**
 * AI 配额管理接口（仅管理员）。
 *
 * 全局每日上限存在 Redis，改完即时生效、无需重启或重新部署。
 * 管理员身份由 AdminGuard 基于 ADMIN_USER_IDS 环境变量判定。
 */
@ApiTags('AI配额管理')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('ai/quota')
export class AiQuotaController {
  private readonly logger = new Logger(AiQuotaController.name);

  constructor(private readonly aiQuotaService: AiQuotaService) {}

  @ApiOperation({ summary: '查询当前全局每日 AI 配额' })
  @Get()
  async getLimit() {
    const limit = await this.aiQuotaService.getLimit();
    return ResOp.success({ limit });
  }

  @ApiOperation({
    summary: '设置全局每日 AI 配额',
    description: '传入 >= 0 的整数，0 表示不限制；立即对后续请求生效',
  })
  @Put()
  async setLimit(@Body() body: { limit?: number }) {
    const limit = Number(body?.limit);
    if (!Number.isFinite(limit) || limit < 0) {
      throw new BadRequestException('配额必须是 >= 0 的整数');
    }
    const saved = await this.aiQuotaService.setLimit(limit);
    return ResOp.success({ limit: saved });
  }

  @ApiOperation({
    summary: '查询指定用户当日 AI 使用情况',
    description: '返回已用次数、当前上限、是否在白名单',
  })
  @Get('usage/:userId')
  async getUsage(@Param('userId') userId: string) {
    const usage = await this.aiQuotaService.getUsage(userId);
    return ResOp.success(usage);
  }
}
