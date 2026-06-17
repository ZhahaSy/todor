import { useState, useEffect, useRef, useCallback } from "react";
import { getChatHistory } from "@client/api";

export interface HistRecordItem {
  role: "local" | "ai";
  content: string;
  date: string;
  todoId: string;
}

export type ReturnType = {
  /**
   * 聊天记录
   */
  messages: HistRecordItem[];
  /**
   * 初始加载中
   */
  initialLoading: boolean;
  /**
   * 初始加载失败的错误信息
   */
  error: string | null;
  /**
   * 是否正在加载更多历史（触顶加载）
   */
  loadingMore: boolean;
  /**
   * 是否还有更多历史记录可加载
   */
  hasMore: boolean;
  /**
   * 加载更早的历史记录（触顶调用）
   */
  loadMore: () => Promise<void>;
  /**
   * 添加聊天记录
   */
  addMessage: (
    message: HistRecordItem,
    options?: { skipPersist?: boolean }
  ) => Promise<boolean>;
  /** 将增量文本追加到最后一条 AI 消息（流式输出用） */
  appendToLastAiContent: (delta: string) => void;
  /** 将最后一条 AI 消息设为完整内容（done 时兜底，避免 token 未解析时界面空白） */
  replaceLastAiContent: (full: string) => void;
  /** 重新加载初始数据 */
  reload: () => Promise<void>;
};

const PAGE_SIZE = 10;

export const useChat = (): ReturnType => {
  const [messages, setMessages] = useState<HistRecordItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // offset 以「已加载总数」为准（不含乐观追加的新消息）
  const offsetRef = useRef(0);
  // 初始化是否完成
  const initializedRef = useRef(false);

  // 加载一页数据，prepend=true 时插入到头部（触顶加载历史）
  const fetchPage = useCallback(async (offset: number, prepend: boolean) => {
    const res = await getChatHistory({ limit: PAGE_SIZE, offset });
    const { list, total } = res as { list: HistRecordItem[]; total: number };

    if (prepend) {
      setMessages((prev) => [...(list as HistRecordItem[]), ...prev]);
    } else {
      setMessages(list as HistRecordItem[]);
    }

    offsetRef.current = offset + list.length;
    // 已加载数量 >= 总数时没有更多
    setHasMore(offsetRef.current < total);
  }, []);

  // 初始化：加载最新一页（最后 PAGE_SIZE 条）
  const reload = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    try {
      await fetchPage(0, false);
    } catch (err) {
      setError("加载聊天记录失败，请重试");
      console.error("Failed to init messages:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    reload();
  }, [reload]);

  // 触顶加载更早的历史
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    // 当前已加载最早那页的 offset（messages 头部对应的 offset）
    // 我们需要向前再取一页
    const currentLoaded = offsetRef.current;
    // 总条数需要重新查一次来确定前面还有多少
    // 简化：直接用当前 messages.length 推算前面的 offset
    const loadedCount = messages.length;
    // 最早已加载消息的全局 offset = total - loadedCount（近似）
    // 直接用 offsetRef 倒推：offsetRef 是已加载的末尾，当前 messages 从 (offsetRef - messages.length) 开始
    const earliestOffset = currentLoaded - loadedCount;
    const prevOffset = Math.max(0, earliestOffset - PAGE_SIZE);
    const fetchCount = earliestOffset - prevOffset;

    if (fetchCount <= 0) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    try {
      const res = await getChatHistory({ limit: fetchCount, offset: prevOffset });
      const { list, total } = res as { list: HistRecordItem[]; total: number };
      setMessages((prev) => [...(list as HistRecordItem[]), ...prev]);
      // hasMore：prevOffset > 0 说明前面还有数据
      setHasMore(prevOffset > 0);
      // 更新 offset 保持指向已加载的末尾（不变），total 用于边界判断
      void total;
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, messages?.length]);

  const addMessage = useCallback(
    async (
      { role, content, date, todoId }: HistRecordItem,
      // options 保留以兼容调用方；持久化已统一由后端在流式完成时处理，前端仅内存渲染
      _options?: { skipPersist?: boolean }
    ): Promise<boolean> => {
      try {
        const newMessage: HistRecordItem = { role, content, date, todoId };
        setMessages((prev) => [...prev, newMessage]);
        return true;
      } catch (error) {
        console.error("Message add failed:", error);
        return false;
      }
    },
    []
  );

  const appendToLastAiContent = useCallback((delta: string) => {
    if (!delta) return;
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== "ai") return prev;
      const next = [...prev];
      next[next.length - 1] = {
        ...last,
        content: last.content + delta,
      };
      return next;
    });
  }, []);

  const replaceLastAiContent = useCallback((full: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== "ai") return prev;
      const next = [...prev];
      next[next.length - 1] = { ...last, content: full };
      return next;
    });
  }, []);

  return {
    messages,
    initialLoading,
    error,
    loadingMore,
    hasMore,
    loadMore,
    addMessage,
    appendToLastAiContent,
    replaceLastAiContent,
    reload,
  };
};
