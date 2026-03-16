import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notification.service';
import styles from './index.module.less';
import { BellOutlined } from '@ant-design/icons';

interface Notification {
  id: number;
  title: string;
  content: string;
  read: boolean;
  type: string;
  createdAt: string;
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      ));
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestNotificationPermission();
    if (granted) {
      alert('通知权限已授予');
    } else {
      alert('通知权限被拒绝');
    }
  };

  return (
    <div className={styles.container}>
      <button 
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <BellOutlined />
        {unreadCount > 0 && (
          <span className={styles.unreadBadge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>消息中心</h3>
            {unreadCount > 0 && (
              <button 
                className={styles.markAllButton}
                onClick={handleMarkAllAsRead}
              >
                全部已读
              </button>
            )}
          </div>
          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyState}>暂无通知</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.read && styles.unread}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className={styles.notificationContent}>
                    <h4 className={styles.notificationTitle}>{notification.title}</h4>
                    <p className={styles.notificationText}>{notification.content}</p>
                    <span className={styles.notificationTime}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!notification.read && (
                    <div className={styles.unreadDot}></div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className={styles.footer}>
            <button 
              className={styles.permissionButton}
              onClick={handleRequestPermission}
            >
              启用浏览器通知
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;