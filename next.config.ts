import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev when opening via 127.0.0.1 (server often binds to localhost)
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
  // Let Notion embed our app (Summarizer, Clarify, Reno Times) so links work with HTTPS
  async headers() {
    const allowNotionEmbed = {
      key: "Content-Security-Policy",
      value: "frame-ancestors https://www.notion.so https://notion.so https://*.notion.so;",
    };
    return [
      { source: "/", headers: [allowNotionEmbed] },
      { source: "/clarify", headers: [allowNotionEmbed] },
      { source: "/reno-times", headers: [allowNotionEmbed] },
      { source: "/research", headers: [allowNotionEmbed] },
    ];
  },
};

export default nextConfig;
