/** @type {import('next').NextConfig} */
const nextConfig = {
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

