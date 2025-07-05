import type { NextConfig } from "next";
import CopyWebpackPlugin from "copy-webpack-plugin";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Copy templates to the webpack output directory
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          { from: "templates", to: "templates" },
          { from: "lib/tools/templates", to: "lib/tools/templates" }
        ]
      })
    );
    return config;
  }
};

export default nextConfig;
