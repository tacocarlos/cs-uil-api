"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — resolvedTheme is undefined on the server and
  // during the first client render before next-themes has read localStorage.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render an invisible placeholder that occupies the same space so the
    // layout doesn't shift once the real button appears.
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-hidden="true"
        tabIndex={-1}
        className="invisible"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
