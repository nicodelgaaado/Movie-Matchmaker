"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const storageKey = "theme";

export function ThemeToggle() {
  const applyTheme = (nextTheme: Theme) => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
  };

  const handleToggle = () => {
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";

    applyTheme(nextTheme);
  };

  return (
    <Button
      aria-label="Toggle theme"
      className="border-border bg-background/80 text-foreground hover:bg-muted"
      onClick={handleToggle}
      size="icon-sm"
      title="Toggle theme"
      type="button"
      variant="outline"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  );
}
