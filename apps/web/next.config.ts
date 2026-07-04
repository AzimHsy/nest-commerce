import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  // Monorepo: pin Turbopack's root to the repo root so file tracing is
  // deterministic instead of inferred from lockfile location.
  turbopack: {
    root: join(__dirname, "..", ".."),
  },
};

export default nextConfig;
