import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/auth.store";

const accentMap: Record<string, string> = {
  teal: "45 212 191",
  coral: "255 116 96",
  amber: "255 179 71",
  green: "68 220 123",
  red: "255 89 94",
};

export const useThemeEffect = () => {
  const theme = useAuthStore((state) => state.user?.settings.theme ?? "dark");
  const accent = useAuthStore((state) => state.user?.settings.accentColor ?? "teal");

  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : theme;

    root.dataset.theme = resolvedTheme;
    root.style.setProperty("--accent-rgb", accentMap[accent] ?? accentMap.teal);
  }, [accent, theme]);
};
