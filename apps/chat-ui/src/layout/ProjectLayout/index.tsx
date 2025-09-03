import React from "react";
import styles from "./index.module.less";
import Sidebar from "@/components/SideBar";
import { Outlet } from "react-router-dom";
const Independent: React.FC = () => {

  return (
    <div className={styles.layout}>
      <Sidebar />

      <Outlet/>
    </div>
  );
};

export default Independent;
