/** @type {import('next').NextConfig} */
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN || '';
const replitDomains = process.env.REPLIT_DOMAINS || '';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    'localhost:3000',
    'localhost:5000',
    'localhost:5173',
    '127.0.0.1:5000',
    replitDevDomain,
    ...replitDomains.split(',').filter(Boolean),
  ].filter(Boolean),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
