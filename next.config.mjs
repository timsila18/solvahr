/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.100.46"],
  distDir: process.env.SOLVA_NEXT_DIST_DIR || ".next",
};

export default nextConfig;
