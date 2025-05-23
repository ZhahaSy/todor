export class CreateTodoDto {
  readonly title: string;
  readonly content: string;
  readonly type: 'work' | 'life' | 'study';
  readonly priority: 'low' | 'medium' | 'high';
  readonly isUrgent: boolean;
  readonly status: 'active' | 'completed';
  readonly createTime: Date;
  readonly originInput: string;
  readonly originOutput: string;
}
