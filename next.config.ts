import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Every route in this POS requires auth + live Supabase data per request,
     so static prerendering (cacheComponents) provides no value and only
     breaks authenticated pages — keep classic dynamic rendering. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
