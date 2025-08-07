import { Avatar, Popover } from "antd";
import useUserStore from "../../store/useUserStore";
import { User } from "../../entities/user";

const UserSelector = () => {
  const { userList, setUser } = useUserStore();

  return (
    <Popover
      trigger="click"
      content={
        <ul>
          {userList?.map((item: User) => (
            <li
              style={{ display: "flex", gap: 8 }}
              onClick={() => setUser(item)}
              key={item.id}
            >
              <Avatar size={24} />
              <div>{item.name}</div>
            </li>
          ))}
        </ul>
      }
    >
      <Avatar size={40} />
    </Popover>
  );
};

export default UserSelector;
