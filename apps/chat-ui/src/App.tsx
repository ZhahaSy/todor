import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';

import routers from '@/router';

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
            <RouterProvider router={routers} />
        </AntdApp>
    </ConfigProvider>
);

export default App;
