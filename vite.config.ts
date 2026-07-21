import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { formatApplicationVersion } from "./src/shared/appVersion";

const appVersion = formatApplicationVersion(new Date());

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["tests/e2e/**", "node_modules/**", ".kilo/**", "dist/**"],
  },
});
