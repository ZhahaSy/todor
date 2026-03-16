import request from "@client/request";

export interface Notification {
    id: number;
    title: string;
    content: string;
    read: boolean;
    type: string;
    todoId?: number;
    createdAt: string;
    updatedAt: string;
}

export const getNotifications = async () => {
    return request.get<Notification[]>('/message/notifications');
}

export const markAsRead = async (id: number) => {
    return request.post<Notification>(`/message/notifications/${id}/read`, {});
}

export const markAllAsRead = async () => {
    return request.post<{ message: string }>('/message/notifications/read-all', {});
}

export const getUnreadCount = async () => {
    return request.get<{ count: number }>('/message/notifications/unread-count');
}