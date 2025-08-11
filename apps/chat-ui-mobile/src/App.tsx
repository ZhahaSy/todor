import "./App.css";
import { SenderPanel, ChatList } from "@client/ui";
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useChat, useSendMessage } from "@client/hooks";

export const ConfigProviderConfig = {
    locale: zhCN,
    theme: {
        token: {
            colorPrimary: '#E48D2C',
            borderRadius: 8,
            paddingContentHorizontal: 13,
            paddingContentVertical: 4,
            colorText: '#61666D',
            colorBorder: '#C9CCD0',
        },
    },
};

const App = () => {
    const { messages, addMessage } = useChat();
    const { handleSubmit, handleCancel, handleRetry, loading } = useSendMessage(addMessage);
    return (
        <ConfigProvider {...ConfigProviderConfig}>
            <AntdApp className='app'>
                <ChatList messages={messages} loading={loading} onRetry={handleRetry} />
                <SenderPanel onSubmit={handleSubmit} onCancel={handleCancel} sending={loading} />
            </AntdApp>
        </ConfigProvider>
    );
};

export default App;
