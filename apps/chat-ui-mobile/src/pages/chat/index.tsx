import { ChatList, SenderPanel } from "@client/ui"
import { useChat, useSendMessage } from "@client/hooks";

const Chat = () => {
    const { messages, addMessage } = useChat();
    const { handleSubmit, handleCancel, handleRetry, loading } = useSendMessage(addMessage);
    return (
        <div>
            <ChatList messages={messages} loading={loading} onRetry={handleRetry} />
            <SenderPanel onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
    )
}
export default Chat;