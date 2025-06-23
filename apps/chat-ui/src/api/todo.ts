import { TodoItemEntity } from "../entities/todo";
import request from "../request";

export const getTodoList = async (params: {
  todoMonth?: string;
  type?: ("work" | "life" | "study" | "all")[];
}) => {
  const data = await request.get("/todo/list", { params });
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
