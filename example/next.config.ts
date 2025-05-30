import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_R2_HOST!,
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
