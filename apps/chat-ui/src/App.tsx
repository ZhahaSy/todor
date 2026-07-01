import { bindAntdMessageApi, setBaseURL } from '@client/request';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useLayoutEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import routers from '@/router';
import useThemeStore from '@/store/useThemeStore';

// Capacitor Android 下使用公网地址
if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
  setBaseURL(import.meta.env.VITE_API_BASE_URL ?? '/api/');
}

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
        // 开启 CSS 变量：antd 会把所有设计 token 注入为 --ant-* 变量到 :root，
        // 切换算法时变量值自动更新，自定义样式引用这些变量即可随主题联动。
        cssVar: true,
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

const App = () => {
    const mode = useThemeStore((s) => s.mode);
    return (
        <ConfigProvider
            {...ConfigProviderConfig}
            theme={{
                ...ConfigProviderConfig.theme,
                algorithm:
                    mode === 'dark'
                        ? antdTheme.darkAlgorithm
                        : antdTheme.defaultAlgorithm,
            }}
        >
            <AntdApp className='app'>
                <RequestMessageBridge />
                <RouterProvider router={routers} />
            </AntdApp>
        </ConfigProvider>
    );
};

export default App;
