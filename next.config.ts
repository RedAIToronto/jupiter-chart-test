import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: ['api.jup.ag', 'datapi.jup.ag'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers for CDN caching and CORS
  async headers() {
    return [
      {
        source: '/api/jupiter',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=1, stale-while-revalidate=59' },
          { key: 'CDN-Cache-Control', value: 'max-age=60' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'max-age=60' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST' },
        ],
      },
      {
        source: '/api/stream',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'X-Accel-Buffering', value: 'no' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
  
  // API routes config for better performance
  async rewrites() {
    return [
      // Optional: Direct CDN routing for static assets
      {
        source: '/cdn/:path*',
        destination: 'https://cdn.jsdelivr.net/:path*',
      },
    ];
  },
  
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  
  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['@solana/web3.js'],
  },
};

export default nextConfig;
