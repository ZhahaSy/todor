import { useEffect, useState } from "react";
import { TodoItemEntity } from "../../../entities/todo";
import * as TodoApi from "../../../api/todo";

const useTodoList = ({ dependencies }: { dependencies: any[] }) => {
  const [todoList, setTodoList] = useState<TodoItemEntity[]>([]);
  const getTodoList = async () => {
    const res = await TodoApi.getTodoList();
    setTodoList(res);
  };

  const addTodo = async () => {
    await TodoApi.addTodo({
      title: "新任务",
      content: "新任务内容",
      type: "life",
    });
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
    getTodoList();
  }, [dependencies]);

  return {
    todoList,
    getTodoList,
    addTodo,
    updateTodoStatus,
    deleteTodo,
  };
};
export default useTodoList;
