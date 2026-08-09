import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // The engine files import with Node16 ESM `.js` suffixes that resolve to
    // `.ts` sources: Vite handles that automatically.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
