import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
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
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // JWT验证 - Step 4: 被守卫调用
  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('无效的token');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      name: payload.name,
      email: payload.email,
      age: payload.age,
      gender: payload.gender,
      hobby: payload.hobby,
    };
  }
}
