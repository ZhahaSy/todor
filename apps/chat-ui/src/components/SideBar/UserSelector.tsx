import useUserStore from "../../store/useUserStore";
import styles from "./UserSelector.module.less";

interface UserSelectorProps {
  isShowName?: boolean;
}

const UserSelector = ({ isShowName }: UserSelectorProps) => {
  const { user } = useUserStore();

  const initial = user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className={styles.userSelector}>
      <div className={styles.avatar}>{initial}</div>
      {isShowName && (
        <div className={styles.info}>
          <div className={styles.name}>{user?.name ?? "用户"}</div>
          <div className={styles.email}>{user?.email ?? ""}</div>
        </div>
      )}
    </div>
  );
};

export default UserSelector;
