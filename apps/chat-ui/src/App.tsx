import { bindAntdMessageApi } from '@client/request';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useLayoutEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import routers from '@/router';

/** 把 App.useApp() 的 message 交给 axios 拦截器，否则静态 message 可能不挂载到当前 ConfigProvider */
const RequestMessageBridge = () => {
    const { message } = AntdApp.useApp();
    useLayoutEffect(() => {
        bindAntdMessageApi(message);
        return () => bindAntdMessageApi(null);
    }, [message]);
    return null;
};

export const ConfigProviderConfig = {
    locale: zhCN,
    theme: {
        token: {
            colorPrimary: '#5B6EF5',
            borderRadius: 10,
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
        },
        components: {
            Menu: {
                itemBorderRadius: 8,
                itemMarginInline: 8,
            },
        },
    },
};

const App = () => (
    <ConfigProvider {...ConfigProviderConfig}>
        <AntdApp className='app'>
            <RequestMessageBridge />
            <RouterProvider router={routers} />
        </AntdApp>
    </ConfigProvider>
);

export default App;
