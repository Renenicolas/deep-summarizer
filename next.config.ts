import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev when opening via 127.0.0.1 (server often binds to localhost)
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
