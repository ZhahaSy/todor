import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';

import routers from '@/router';

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

const App = () => (
    <ConfigProvider {...ConfigProviderConfig}>
        <AntdApp className='app'>
            <RouterProvider router={routers} />
        </AntdApp>
    </ConfigProvider>
);

export default App;
