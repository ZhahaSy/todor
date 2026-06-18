import { createBrowserRouter, createHashRouter, redirect, RouteObject } from "react-router-dom"
import ProjectLayout from "@/layout/ProjectLayout";
import Home from "@/pages/chat";
import {loginPage as Login, SignIn} from "@client/ui";
import Todo from "@/pages/todo";
import Setting from "@/pages/setting";
import SkillHubPage from "@/pages/skill-hub";
import AdminQuota from "@/pages/admin-quota";
import AdminRoute from "@/components/AdminRoute";

type RouterType = ReturnType<typeof createBrowserRouter>;

const routes: RouteObject[] = [
    {
        path: '/',
        element: <ProjectLayout />,
        children: [
            {
                index: true,
                loader: () => {
                    return redirect('/chat');
                },
            },
            {
                path: '/chat',
                element: <Home />,
            },
            {
                path: '/todo',
                element: <Todo />,
            },
            {
                path: '/setting',
                element: <Setting />,
            },
            {
                path: '/skill-hub',
                element: <SkillHubPage />,
            },
            {
                path: '/admin/quota',
                element: (
                    <AdminRoute>
                        <AdminQuota />
                    </AdminRoute>
                ),
            },

        ]
    },
    {
        path: '/login',
        element: <Login onSignIn={() => {
            console.log('onSignIn');
            window.location.href = isCapacitor ? '/#/signin' : '/signin';
        }} />,
    },
    {
        path: '/signin',
        element: <SignIn />,
    },
]

const isCapacitor = typeof window !== "undefined" && window.location.protocol === "capacitor:";
const router: RouterType = isCapacitor
  ? createHashRouter(routes)
  : createBrowserRouter(routes, { basename: import.meta.env.VITE_ROUTER_BASE });

export default router;
