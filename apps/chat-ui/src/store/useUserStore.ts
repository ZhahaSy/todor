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
    const data = await getUserList();
    set({ userList: data, user: data[0] || {} as User });
  },
  setUser: (user: User) => {
    set({ user });
  },
}));

export default useUserStore;
