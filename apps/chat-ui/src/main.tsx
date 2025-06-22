import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './style/index.ts'
import App from './App.tsx'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
