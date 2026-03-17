export class CreateChatDto {
  readonly content: string;
  readonly role: 'local' | 'ai';
  readonly date: string;
  readonly sessionId?: string; // 不传则使用用户名（主对话）
  readonly title?: string;     // 深入会话标题，首条消息自动截取
}
