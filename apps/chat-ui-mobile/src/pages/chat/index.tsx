import { ChatList, SenderPanel } from "@client/ui"
import { useChat, useSendMessage } from "@client/hooks";

const Chat = () => {
    const {
      messages,
      addMessage,
      appendToLastAiContent,
      replaceLastAiContent,
      initialLoading,
      error,
      reload,
      loadingMore,
      hasMore,
      loadMore,
    } = useChat();
    const { handleSubmit, handleCancel, loading } = useSendMessage({
      addMessage,
      appendToLastAiContent,
      replaceLastAiContent,
    });
    return (
        <div>
            <ChatList
                messages={messages}
                loading={loading}
                initialLoading={initialLoading}
                error={error}
                onRetry={reload}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
            />
            <SenderPanel onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
    )
}
export default Chat;