"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Get initial theme with type checking
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";

    const initialTheme: Theme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : systemTheme;

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    if (!theme) return; // Prevent toggling before theme is set

    const newTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Prevent rendering mismatched theme before hydration
  if (!mounted || theme === null) {
    return null;
  }

  return (
    <div
      onClick={toggleTheme}
      className="flex items-center cursor-pointer transition-transform duration-500"
    >
      {theme === "light" ? (
        <Sun className="h-6 w-6 text-yellow-500 transition-all" />
      ) : (
        <Moon className="h-6 w-6 text-blue-500 transition-all" />
      )}
    </div>
  );
}
