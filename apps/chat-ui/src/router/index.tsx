import { createBrowserRouter, redirect, RouteObject } from "react-router-dom"
import ProjectLayout from "@/layout/ProjectLayout";
import Home from "@/pages/chat";
import {loginPage as Login} from "@client/ui";
import Todo from "@/pages/todo";
import Setting from "@/pages/setting";

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
            }

        ]
    },
    {
        path: '/login',
        element: <Login />,
    }
]

const router: RouterType = createBrowserRouter(routes, { basename: import.meta.env.VITE_ROUTER_BASE });

export default router;