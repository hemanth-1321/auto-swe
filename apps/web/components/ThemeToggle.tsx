"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-3 ">
      {isDark ? (
        <>
          <Moon className="h-5 w-5 text-blue-500" />
          <span>Dark mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5 text-yellow-500" />
          <span>Light mode</span>
        </>
      )}
      <Switch
        checked={isDark}
        onCheckedChange={(checked: boolean) =>
          setTheme(checked ? "dark" : "light")
        }
        aria-label="Toggle dark mode"
        className="cursor-pointer"
      />
    </div>
  );
}
