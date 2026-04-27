/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xqlrhzpdsmzpuqgawqwt.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

module.exports = nextConfig;
