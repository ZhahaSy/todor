export interface ChatHistory {
  id?: string;
  role?: 'ai' | 'local';
  todoId?: string;
  messages?: string[];
}