export interface TodoItemEntity {
  id: string;

  title: string;

  content: string;

  originInput: string;

  originOutput: string;

  type: 'work' | 'life' | 'study';

  priority: 'low' | 'medium' | 'high';

  isUrgent: boolean;

  status: 'active' | 'completed';

  createTime: number;
}
