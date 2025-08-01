import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from './constants';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 自定义token提取函数，优先从cookie中获取，其次从Authorization头获取
      jwtFromRequest: (request: Request) => {
        // 从cookie中获取token
        const tokenFromCookie = request.cookies?.token;
        if (tokenFromCookie) {
          return tokenFromCookie;
        }

        // 从Authorization头获取Bearer token
        return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      },
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  // JWT验证 - Step 4: 被守卫调用
  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('无效的token');
    }
    return {
      username: payload.username,
      userId: payload.sub,
      realName: payload.realName,
      role: payload.role,
    };
  }
}
