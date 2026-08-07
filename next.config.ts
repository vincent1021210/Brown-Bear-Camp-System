import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: isGithubPages ? "/Brown-Bear-Camp-System" : "",
  assetPrefix: isGithubPages ? "/Brown-Bear-Camp-System/" : undefined,
};

export default nextConfig;
