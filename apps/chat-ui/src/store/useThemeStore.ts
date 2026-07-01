import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "chat-ui-theme";

/** 读取初始主题：localStorage > 系统偏好 > light */
const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

/** 把主题写到 html[data-theme]，供少数 antd 变量覆盖不到的自定义样式使用 */
const applyDomAttr = (mode: ThemeMode) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", mode);
  }
};

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const useThemeStore = create<ThemeState>()((set, get) => {
  const initial = getInitialMode();
  applyDomAttr(initial);
  return {
    mode: initial,
    setMode: (mode) => {
      localStorage.setItem(STORAGE_KEY, mode);
      applyDomAttr(mode);
      set({ mode });
    },
    toggle: () => get().setMode(get().mode === "dark" ? "light" : "dark"),
  };
});

export default useThemeStore;
