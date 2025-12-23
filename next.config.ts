import type { NextConfig } from "next";

const repoName =
  process.env.NEXT_PUBLIC_BASE_PATH?.replace(/^\/+|\/+$/g, "") ?? "";
const basePath = repoName ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
