/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow images from Farcaster/Neynar CDNs
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.warpcast.com',
      },
    ],
  },
  // Disable static optimization for dynamic content
  experimental: {
    serverComponentsExternalPackages: ['viem', 'wagmi', '@farcaster/miniapp-sdk', '@farcaster/miniapp-wagmi-connector'],
  },
  // Security: Force HTTPS in production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // X-Frame-Options removed - using CSP frame-ancestors instead
          // Farcaster Mini Apps need to be embeddable in Farcaster clients
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.coingecko.com https://sepolia.base.org https://mainnet.base.org wss://sepolia.base.org wss://mainnet.base.org https://*.supabase.co https://iophfhfnctqufqsmunyz.supabase.co",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Allow Farcaster Mini App to be embedded in Farcaster clients
              // Per Farcaster docs: Mini Apps are loaded in iframes
              "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com https://farcaster.xyz https://warpcast.com",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize viem/wagmi on server-side to prevent bundling issues
      const externals = config.externals || [];
      config.externals = [
        ...(Array.isArray(externals) ? externals : [externals]),
        'viem',
        'wagmi',
        '@farcaster/miniapp-sdk',
        '@farcaster/miniapp-wagmi-connector',
      ];
    } else {
      config.externals = config.externals || [];
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }
    
    // Ignore optional dependencies that cause build errors
    config.resolve.alias = {
      ...config.resolve.alias,
      '@base-org/account': false,
      '@coinbase/wallet-sdk': false,
      '@gemini-wallet/core': false,
      '@metamask/sdk': false,
      '@safe-global/safe-apps-sdk': false,
      '@safe-global/safe-apps-provider': false,
      '@walletconnect/ethereum-provider': false,
      'porto': false,
      'porto/internal': false,
    };
    
    // Ignore React Native modules for browser build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      fs: false,
      net: false,
      tls: false,
    };
    // Fix for viem module resolution
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
    };
    return config;
  },
  // External packages for server components - this prevents bundling issues
  experimental: {
    serverComponentsExternalPackages: ['viem', 'wagmi', '@farcaster/miniapp-sdk', '@farcaster/miniapp-wagmi-connector'],
  },
};

module.exports = nextConfig;

