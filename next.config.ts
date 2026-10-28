import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop search engines indexing any page, as a second layer on top of robots.txt.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
