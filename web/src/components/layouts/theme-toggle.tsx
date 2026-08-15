"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleSwitch() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group cursor-pointer rounded-full bg-gray-3 p-1.25 text-dark outline-0 hover:outline-primary focus:outline-primary focus-visible:outline dark:bg-[#020D1A] dark:text-current"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="sr-only">Switch to {isDark ? "light" : "dark"} mode</span>

      <span aria-hidden className="relative flex gap-2.5">
        <span className="absolute size-9.5 rounded-full border border-gray-3 bg-white transition-all dark:translate-x-12.5 dark:border-none dark:bg-dark-2 dark:group-hover:bg-dark-3" />
        <span
          className={cn(
            "relative grid size-9.5 place-items-center rounded-full",
            !isDark && "text-primary"
          )}
        >
          <Sun className="size-5" />
        </span>
        <span
          className={cn(
            "relative grid size-9.5 place-items-center rounded-full",
            isDark && "text-white"
          )}
        >
          <Moon className="size-5" />
        </span>
      </span>
    </button>
  );
}
