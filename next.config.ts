import withPWA from "next-pwa";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

const pwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
};

const isDevelopment = process.env.NODE_ENV === "development";

export default isDevelopment ? nextConfig : withPWA(pwaConfig)(nextConfig);
