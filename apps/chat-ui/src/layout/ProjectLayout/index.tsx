import React, { useEffect } from "react";
import styles from "./index.module.less";
import Sidebar from "@/components/SideBar";
import NotificationCenter from "@/components/NotificationCenter";
import { Outlet } from "react-router-dom";
import useUserStore from "@/store/useUserStore";
import { notificationService } from "@/services/notification.service";

const Independent: React.FC = () => {
  const { getUserInfo, user } = useUserStore();

  useEffect(() => {
    getUserInfo();
  }, []);

  useEffect(() => {
    if (user?.id) {
      notificationService.init(user.id);
      console.log("notificationService init user id:", user.id);
    }

    return () => {
      notificationService.disconnect();
    };
  }, [user?.id]);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        {/* <NotificationCenter /> */}

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Independent;
