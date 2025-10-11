import { useEffect, useState } from "react";
import { TodoItemEntity } from "@client/entities";
import * as TodoApi from "@client/api";

export interface UseTodoListReturn {
  todoList: TodoItemEntity[];
  getTodoList: () => Promise<void>;
  addTodo: (
    params: Partial<
      Omit<TodoItemEntity, "id" | "createTime" | "originInput" | "originOutput">
    >
  ) => Promise<void>;
  updateTodoStatus: (
    id: string,
    status: "active" | "completed"
  ) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

const useTodoList = ({
  readyOn,
  getListParams,
}: {
  readyOn: boolean;
  getListParams?: {
    todoMonth?: string;
    type?: ("work" | "life" | "study" | "all")[];
    keyword?: string;
    status?: string;
  };
}) => {
  const [todoList, setTodoList] = useState<TodoItemEntity[]>([]);
  const getTodoList = async (params?: {
    todoMonth?: string;
    type?: ("work" | "life" | "study" | "all")[];
    keyword?: string;
    status?: string;
  }) => {
    const res = await TodoApi.getTodoList({
      ...getListParams,
      ...params,
    });
    setTodoList(res || []);
  };

  const addTodo = async (
    params: Partial<
      Omit<TodoItemEntity, "id" | "createTime" | "originInput" | "originOutput">
    >
  ) => {
    await TodoApi.addTodo(params);
    getTodoList();
  };
  const updateTodoStatus = async (
    id: string,
    status: "active" | "completed"
  ) => {
    await TodoApi.updateTodo({
      id,
      status,
    });
    getTodoList();
  };

  const deleteTodo = async (id: string) => {
    await TodoApi.deleteTodo(id);
    getTodoList();
  };

  useEffect(() => {
    if (readyOn) {
      getTodoList();
    }
  }, [readyOn, getListParams]);

  return {
    todoList,
    getTodoList,
    addTodo,
    updateTodoStatus,
    deleteTodo,
  };
};
export default useTodoList;
