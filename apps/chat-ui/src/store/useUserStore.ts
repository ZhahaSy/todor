import { create } from "zustand";
import { User } from "../entities/user";
import { getUserInfo, getUserList } from "@client/api";

interface UserState {
  user?: User;
  userList: User[];
  getUserInfo: () => Promise<void>;
  getUserList: () => Promise<void>;
  setUser: (user: User) => void;
}

const useUserStore = create<UserState>()((set) => ({
  user: {} as User,
  userList: [],
  getUserInfo: async () => {
    const data = await getUserInfo();
    set({ user: data|| {} as User });
  },
  getUserList: async () => {
    const data = await getUserList();
    set({ userList: data, user: data[0] || {} as User });
  },
  setUser: (user: User) => {
    set({ user });
  },
}));

export default useUserStore;
