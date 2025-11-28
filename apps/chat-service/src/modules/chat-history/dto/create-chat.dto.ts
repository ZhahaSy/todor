export class CreateChatDto {
  readonly content: string;
  readonly role: 'local' | 'ai';
  readonly date: string;
}
