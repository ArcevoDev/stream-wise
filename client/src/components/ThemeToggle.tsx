import { useTheme } from "@arcevo/facet-components";
import { Moon, Sun } from "lucide-react";

/**
 * Plain light/dark theme switch.
 *
 * The facet ThemeToggle renders a DropdownMenu even with items={["light","dark"]}
 * (it always wraps in a DropdownMenu, see the installed chunk). This is a
 * true one-click sun/moon toggle that follows the system theme initially
 * (ThemeProvider defaultTheme="system") and flips between light and dark.
 */
export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
