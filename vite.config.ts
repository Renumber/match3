import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
    version?: string;
  };
  return pkg.version ?? "0.0.0";
}

function readRevision(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function buildVersionPlugin(): Plugin {
  const version = JSON.stringify(readPackageVersion());
  const revision = JSON.stringify(readRevision());
  return {
    name: "build-version",
    transform(code, id) {
      if (!id.replaceAll("\\", "/").endsWith("/src/version.ts")) return null;
      return code.replaceAll("__APP_VERSION__", version).replaceAll("__APP_REVISION__", revision);
    },
  };
}

export default defineConfig({
  plugins: [buildVersionPlugin()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});

