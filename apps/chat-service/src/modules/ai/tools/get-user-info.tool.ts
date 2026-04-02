import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { User } from '../../user/entities/user.entity';

/** 按需创建用户信息工具，捕获当前请求的 userInfo */
export function createGetUserInfoTool(userInfo: User): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_user_info',
    description: '获取当前用户的个人信息（姓名、年龄、性别、兴趣爱好），仅在对话中确实需要时调用',
    schema: z.object({}),
    func: async () =>
      JSON.stringify({
        name: userInfo.name,
        age: userInfo.age ?? null,
        gender: userInfo.gender ?? null,
        hobby: userInfo.hobby ?? null,
      }),
  });
}
