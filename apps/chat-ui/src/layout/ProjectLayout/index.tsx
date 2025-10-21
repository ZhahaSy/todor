import React, { useEffect } from "react";
import styles from "./index.module.less";
import Sidebar from "@/components/SideBar";
import { Outlet } from "react-router-dom";
import useUserStore from "@/store/useUserStore";
const Independent: React.FC = () => {
  const { getUserInfo } = useUserStore();
  useEffect(() => {
    getUserInfo();
  }, []);
  return (
    <div className={styles.layout}>
      <Sidebar />

      <Outlet/>
    </div>
  );
};

export default Independent;
