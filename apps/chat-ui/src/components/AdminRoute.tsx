import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import useUserStore from '@/store/useUserStore';

/**
 * 管理员路由守卫：仅 isAdmin 用户可进入，否则重定向到 /chat。
 *
 * 注意：这只是前端体验层面的拦截，真正的权限校验在后端 AdminGuard。
 * user 信息可能尚未加载完成（store 初始为空对象），加载期间显示 Spin，
 * 避免在数据回来前误判为非管理员而踢走。
 */
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, getUserInfo } = useUserStore();
  const [ready, setReady] = useState(!!user?.id);

  useEffect(() => {
    if (!user?.id) {
      getUserInfo().finally(() => setReady(true));
    } else {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
