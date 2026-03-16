import { io, Socket } from "socket.io-client";
import {
  getNotifications as apiGetNotifications,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  getUnreadCount as apiGetUnreadCount,
  type Notification,
} from "@client/api";

import { notification as notificationAntd } from "antd";

class NotificationService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  // 初始化 WebSocket 连接
  init(userId: string) {
    this.userId = userId;
    // 直接连接到命名空间
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    this.socket = io(`${apiUrl}/notifications`, {
      path: "/socket.io",
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.registerUser();
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("notification", (notification) => {
      console.log("Received notification:", notification);

      this.showNotification(notification);
    });
  }

  // 注册用户
  private registerUser() {
    if (this.socket && this.userId) {
      this.socket.emit("register", this.userId);
    }
  }

  // 注销用户
  disconnect() {
    if (this.socket && this.userId) {
      this.socket.emit("unregister", this.userId);
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 请求通知权限
  async requestNotificationPermission(): Promise<boolean> {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  // 显示浏览器通知
  showNotification(notification: Notification) {
    notificationAntd.open({
      message: notification.title,
      description: notification.content,
    });
  }

  // 获取通知列表
  async getNotifications(): Promise<Notification[]> {
    try {
      return await apiGetNotifications();
    } catch (error) {
      console.error("Failed to get notifications:", error);
      throw error;
    }
  }

  // 标记通知为已读
  async markAsRead(notificationId: number): Promise<Notification> {
    try {
      return await apiMarkAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark as read:", error);
      throw error;
    }
  }

  // 标记所有通知为已读
  async markAllAsRead(): Promise<{ message: string }> {
    try {
      return await apiMarkAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      throw error;
    }
  }

  // 获取未读通知数量
  async getUnreadCount(): Promise<number> {
    try {
      const result = await apiGetUnreadCount();
      return result.count;
    } catch (error) {
      console.error("Failed to get unread count:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
