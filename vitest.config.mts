import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: { include: ["**/*.test.ts"], exclude: ["node_modules/**", ".next/**"] },
});
