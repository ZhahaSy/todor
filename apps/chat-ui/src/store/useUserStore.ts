import { create } from "zustand";
import { User } from "../entities/user";
import { getUserInfo } from "@client/api";

interface UserState {
  user?: User;
  getUserInfo: () => Promise<void>;
  setUser: (user: User) => void;
}

const useUserStore = create<UserState>()((set) => ({
  user: {} as User,
  getUserInfo: async () => {
    const data = await getUserInfo();
    set({ user: data || ({} as User) });
  },
  setUser: (user: User) => {
    set({ user });
  },
}));

export default useUserStore;
