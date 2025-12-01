import { TodoItemEntity } from "@client/entities";
import request from "@client/request";

export const getTodoList = async (params: {
  todoMonth?: string;
  type?: ("work" | "life" | "study" | "all")[];
}) => {
  const data = await request.get<TodoItemEntity[]>("/todo/list", { params });
  return data;
};
export const getTodoById = async (id: string) => {
  const data = await request.get<TodoItemEntity>(`/todo/${id}`);
  return data;
};
export const addTodo = async (data: Partial<TodoItemEntity>) => {
  const res = await request.post("/todo/create", data);
  return res;
};
export const deleteTodo = async (id: string) => {
  const res = await request.post(`/todo/delete`, { id });
  return res;
};
export const updateTodo = async (data: Partial<TodoItemEntity>) => {
  const res = await request.post(`/todo/update`, data);
  return res;
};
