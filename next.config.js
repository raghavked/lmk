/** @type {import('next').NextConfig} */
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN || '';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    'localhost:3000',
    'localhost:5173',
    replitDevDomain,
  ].filter(Boolean),
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
