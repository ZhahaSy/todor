import React, { useEffect, useState } from "react";
import styles from "./index.module.less";
import Sidebar from "@/components/SideBar";
import { Outlet, useLocation } from "react-router-dom";
import useUserStore from "@/store/useUserStore";
import { notificationService } from "@/services/notification.service";
import { Button, Drawer } from "antd";
import { MenuOutlined } from "@ant-design/icons";

const MOBILE_BREAKPOINT = 768;

const PAGE_TITLES: Record<string, string> = {
  "/chat": "Chat",
  "/todo": "My Todo",
  "/skill-hub": "技能库",
  "/setting": "Setting",
};

const Independent: React.FC = () => {
  const { getUserInfo, user } = useUserStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ?? "Chat";

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

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className={`${styles.layout} ${isMobile ? styles.mobile : ""}`}>
      {isMobile ? (
        <>
          <div className={styles.mobileHeader}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              className={styles.menuBtn}
              onClick={() => setDrawerOpen(true)}
            />
            <span className={styles.headerTitle}>{pageTitle}</span>
          </div>
          <Drawer
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            width={240}
            styles={{ body: { padding: 0 }, header: { display: "none" } }}
          >
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </Drawer>
        </>
      ) : (
        <Sidebar />
      )}
      <div className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Independent;
