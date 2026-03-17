import { ChatList, SenderPanel } from "@client/ui"
import { useChat, useSendMessage } from "@client/hooks";

const Chat = () => {
    const { messages, addMessage, loadingMore, hasMore, loadMore } = useChat();
    const { handleSubmit, handleCancel, handleRetry, loading } = useSendMessage(addMessage);
    return (
        <div>
            <ChatList
                messages={messages}
                loading={loading}
                onRetry={handleRetry}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
            />
            <SenderPanel onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
    )
}
export default Chat;