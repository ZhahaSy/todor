import { create } from "zustand";
import { User } from "../entities/user";
import { getUserList } from "@client/api";

interface UserState {
  user?: User;
  userList: User[];
  getUserList: () => Promise<void>;
  setUser: (user: User) => void;
}

const useUserStore = create<UserState>()((set) => ({
  user: {} as User,
  userList: [],
  getUserList: async () => {
    const userList = await getUserList();
    set({ userList, user: userList[0] });
  },
  setUser: (user: User) => {
    set({ user });
  },
}));

export default useUserStore;
