import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 管理员守卫：基于环境变量 ADMIN_USER_IDS（逗号分隔的用户 id）判定。
 *
 * 系统目前没有角色机制，用环境变量是改动最小、不需动数据库的做法。
 * 必须配合 JwtAuthGuard 使用（依赖 req.user.userId）。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminIds: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const ids = (this.configService.get<string>('ADMIN_USER_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.adminIds = new Set(ids);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (!userId || !this.adminIds.has(userId)) {
      throw new ForbiddenException('需要管理员权限');
    }
    return true;
  }
}
