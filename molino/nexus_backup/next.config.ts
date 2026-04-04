
import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Type checking enabled - do NOT ignore errors
  // Fix TypeScript errors instead of ignoring them
  typescript: {
    ignoreBuildErrors: false, // Changed: enforce type safety
  },
  // ESLint enabled - do NOT ignore errors
  // Fix linting issues instead of ignoring them
  eslint: {
    ignoreDuringBuilds: false, // Changed: enforce code quality
  },
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    // Optimize image sizes
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
  },
  // Server Actions optimization
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Performance monitoring headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Redirects for deprecated routes
  async redirects() {
    return [];
  },
  // Rewrites for API routes
  async rewrites() {
    return {
      beforeFiles: [
        // Add any rewrites here
      ],
    };
  },
};

export default nextConfig;
