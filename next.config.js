/** @type {import('next').NextConfig} */

const replitDevDomain = process.env.REPLIT_DEV_DOMAIN || '';

const allowedOrigins = [
  'localhost:5000',
  '127.0.0.1:5000',
  '0.0.0.0:5000',
  'localhost',
  replitDevDomain,
  '.replit.dev',
  '.worf.replit.dev',
  '.repl.co',
].filter(Boolean);

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  reactStrictMode: true,
  allowedDevOrigins: allowedOrigins,
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
