import { Avatar, Popover } from "antd";
import useUserStore from "../../store/useUserStore";
import { User } from "../../entities/user";
import aiAvatar from "@/assets/todor-2d-no-bg.png";

interface UserSelectorProps {
  isShowName?: boolean;
}
const UserSelector = ({isShowName}: UserSelectorProps) => {
  const { userList, setUser, user } = useUserStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 24 }}>
        <Avatar size={24} src={user?.avatar || aiAvatar} />
         {isShowName && <div>{user?.name}</div>}
      </div>
    // <Popover
    //   trigger="click"
    //   content={
    //     <ul>
    //       {userList?.map((item: User) => (
    //         <li
    //           style={{ display: "flex", gap: 8 }}
    //           onClick={() => setUser(item)}
    //           key={item.id}
    //         >
    //           <Avatar size={24} src={item.avatar || aiAvatar} />
    //           <div>{item.name}</div>
    //         </li>
    //       ))}
    //     </ul>
    //   }
    // >
    //   <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 24 }}>
    //     <Avatar size={24} src={user?.avatar || aiAvatar} />
    //      {isShowName && <div>{user?.name}</div>}
    //   </div>
    // </Popover>
  );
};

export default UserSelector;
