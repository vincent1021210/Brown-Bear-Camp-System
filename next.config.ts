import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const basePath = isGithubPages ? "/Brown-Bear-Camp-System" : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: isGithubPages ? `${basePath}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
