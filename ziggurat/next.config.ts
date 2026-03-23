import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Use a short distDir to avoid Windows MAX_PATH (260 char) limit
  // when the repo is in a deeply nested download folder
  distDir: ".out",
};

export default nextConfig;
