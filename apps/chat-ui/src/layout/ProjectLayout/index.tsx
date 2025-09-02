import React, { useEffect } from "react";
import styles from "./index.module.less";
import Sidebar from "@/components/SideBar";
import useUserStore from "@/store/useUserStore";
import { Outlet } from "react-router-dom";
const Independent: React.FC = () => {
  const { getUserList } = useUserStore();
  useEffect(() => {
    getUserList();
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar
      />

      <Outlet/>
    </div>
  );
};

export default Independent;
