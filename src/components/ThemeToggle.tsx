"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

const HIDDEN_PREFIXES = ["/login", "/register", "/forgot-password"];

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hidden =
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`)) ||
    pathname?.startsWith("/interview/");

  if (!mounted || hidden) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-md backdrop-blur-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label="Toggle light and dark mode"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
