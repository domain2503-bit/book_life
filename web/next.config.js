/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.pstatic.net" },
      { protocol: "https", hostname: "**.naver.com" },
      { protocol: "https", hostname: "**.kakao.com" },
    ],
  },
};

module.exports = nextConfig;
