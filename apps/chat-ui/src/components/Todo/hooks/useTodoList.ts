import { useEffect, useState } from "react";
import { TodoItemEntity } from "@client/entities";
import * as TodoApi from "@client/api";

export interface UseTodoListReturn {
  todoList: TodoItemEntity[];
  loading: boolean;
  actionLoading: boolean;
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
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getTodoList = async (params?: {
    todoMonth?: string;
    type?: ("work" | "life" | "study" | "all")[];
    keyword?: string;
    status?: string;
  }) => {
    setLoading(true);
    try {
      const res = await TodoApi.getTodoList({
        ...getListParams,
        ...params,
      });
      setTodoList(res || []);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (
    params: Partial<
      Omit<TodoItemEntity, "id" | "createTime" | "originInput" | "originOutput">
    >
  ) => {
    setActionLoading(true);
    try {
      await TodoApi.addTodo(params);
      await getTodoList();
    } finally {
      setActionLoading(false);
    }
  };
  const updateTodoStatus = async (
    id: string,
    status: "active" | "completed"
  ) => {
    setActionLoading(true);
    try {
      await TodoApi.updateTodo({
        id,
        status,
      });
      await getTodoList();
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTodo = async (id: string) => {
    setActionLoading(true);
    try {
      await TodoApi.deleteTodo(id);
      await getTodoList();
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (readyOn) {
      getTodoList();
    }
  }, [readyOn, getListParams]);

  return {
    todoList,
    loading,
    actionLoading,
    getTodoList,
    addTodo,
    updateTodoStatus,
    deleteTodo,
  };
};
export default useTodoList;
