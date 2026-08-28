/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* We can add rewrites if we need to proxy requests to backend locally */
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.BACKEND_URL || 'http://127.0.0.1:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
