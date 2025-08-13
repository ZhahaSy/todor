import { createBrowserRouter, redirect, RouteObject } from "react-router-dom"
import BasicLayout from "@/layout/BasicLayout";
import Home from "@/pages/chat/index";
import {loginPage as Login} from "@client/ui";

type RouterType = ReturnType<typeof createBrowserRouter>;

const routes: RouteObject[] = [
    {
        path: '/',
        element: <BasicLayout />,
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
                path: '/login',
                element: <Login />,
            }
        ]
    }
]

const router: RouterType = createBrowserRouter(routes, { basename: import.meta.env.VITE_ROUTER_BASE });

export default router;