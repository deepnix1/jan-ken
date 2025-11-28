"use client";
import { ReactNode, useEffect, useState, useMemo } from "react";
import { baseSepolia } from "wagmi/chains";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { sdk } from "@farcaster/miniapp-sdk";

export function RootProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [metaMaskConnector, setMetaMaskConnector] = useState<any>(null);

  // Load MetaMask connector dynamically to avoid optional dependencies issues
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      // Check for MetaMask with a timeout to avoid extension conflicts
      const checkMetaMask = () => {
        try {
          // Only check for MetaMask specifically, not all ethereum providers
          // This avoids conflicts with other wallet extensions
          const ethereum = (window as any).ethereum;
          if (ethereum && ethereum.isMetaMask) {
            import('wagmi/connectors')
              .then((wagmiConnectors) => {
                try {
                  setMetaMaskConnector(wagmiConnectors.metaMask);
                } catch (error) {
                  console.log('MetaMask connector not available:', error);
                }
              })
              .catch((error) => {
                console.log('Failed to load MetaMask connector:', error);
              });
          }
        } catch (error) {
          // Silently ignore extension conflicts
          console.log('Extension conflict detected, skipping MetaMask connector');
        }
      };
      
      // Use setTimeout to avoid immediate execution conflicts
      const timeoutId = setTimeout(checkMetaMask, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted]);

  // Create config only on client side after mount
  const config = useMemo(() => {
    if (typeof window === 'undefined' || !mounted) {
      return null;
    }
    
    const connectors: any[] = [];
    
    // Add Farcaster Mini App connector (per Farcaster docs)
    // The connector automatically uses sdk.wallet.getEthereumProvider() internally
    try {
      const farcasterConnector = miniAppConnector();
      connectors.push(farcasterConnector);
    } catch (error) {
      console.error('Error creating Farcaster connector:', error);
    }
    
    // Add MetaMask connector if available (for PC/browser testing)
    if (metaMaskConnector) {
      try {
        const mmConnector = metaMaskConnector();
        if (typeof mmConnector === 'function') {
          connectors.push(mmConnector);
        }
      } catch (error) {
        console.log('Error adding MetaMask connector:', error);
      }
    }
    
    return createConfig({
      chains: [baseSepolia],
      transports: {
        [baseSepolia.id]: http('https://sepolia.base.org', {
          timeout: 120000, // 120 second timeout (increased for Farcaster wallet and slow networks)
          retryCount: 10, // More retries for reliability
          retryDelay: 3000, // Longer delay between retries
        }),
      },
      connectors,
      ssr: false, // Disable SSR for wagmi
      // Enable batch for better performance
      batch: {
        multicall: true,
      },
    });
  }, [mounted, metaMaskConnector]);

  // Export config for use in utility functions (client-side only)
  // This is safe because config is only used in client-side code
  if (typeof window !== 'undefined' && config) {
    (globalThis as any).__wagmiConfig = config;
  }

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  // Set mounted state on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Farcaster Mini App SDK
  // Note: sdk.actions.ready() should be called in the main page component
  // after the app is fully loaded, not here in the provider
  // This is just for SDK availability check
  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && !sdkReady) {
      const initSDK = async () => {
        try {
          // Check if we're in a Farcaster Mini App environment
          if (sdk && typeof sdk.actions !== 'undefined') {
            // Don't call ready() here - it should be called in page component
            // after app is fully loaded per Farcaster documentation
            setSdkReady(true);
            console.log('Farcaster Mini App SDK available');
          } else {
            // If not in Farcaster environment, still allow the app to work
            console.log('Not in Farcaster Mini App environment, continuing anyway');
            setSdkReady(true);
          }
        } catch (error) {
          console.error('Error checking Farcaster SDK:', error);
          // Continue anyway - might be running outside Farcaster
          setSdkReady(true);
        }
      };
      initSDK();
    }
  }, [mounted, sdkReady]);

  // Suppress harmless console errors and warnings (Analytics SDK, Farcaster origin checks, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Helper function to check if a message should be suppressed
      const shouldSuppress = (arg: unknown): boolean => {
        if (typeof arg === 'string') {
          return (
            arg.includes('Analytics SDK') || 
            arg.includes('Failed to fetch') ||
            arg.includes('origins don\'t match') || // Farcaster SDK origin check in web browser
            arg.includes('wallet.farcaster.xyz') ||
            arg.includes('privy.farcaster.xyz')
          );
        }
        if (arg && typeof arg === 'object') {
          // Check message property
          if ('message' in arg && typeof arg.message === 'string') {
            return (
              arg.message.includes('Analytics SDK') || 
              arg.message.includes('Failed to fetch') ||
              arg.message.includes('origins don\'t match') ||
              arg.message.includes('wallet.farcaster.xyz') ||
              arg.message.includes('privy.farcaster.xyz')
            );
          }
          // Check toString() result
          try {
            const str = String(arg);
            return (
              str.includes('origins don\'t match') ||
              str.includes('wallet.farcaster.xyz') ||
              str.includes('privy.farcaster.xyz')
            );
          } catch {
            // Ignore toString errors
          }
        }
        return false;
      };
      
      // Suppress console.error for harmless errors
      console.error = (...args: unknown[]) => {
        // Check all arguments, not just the first one
        const shouldIgnore = args.some(arg => shouldSuppress(arg));
        if (shouldIgnore) {
          return; // Ignore harmless errors
        }
        originalError.apply(console, args);
      };
      
      // Suppress console.warn for harmless warnings
      console.warn = (...args: unknown[]) => {
        // Check all arguments, not just the first one
        const shouldIgnore = args.some(arg => shouldSuppress(arg));
        if (shouldIgnore) {
          return; // Ignore harmless warnings
        }
        originalWarn.apply(console, args);
      };
      
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  // Always provide WagmiProvider to avoid WagmiProviderNotFoundError
  // Create a default config if not ready yet
  const finalConfig = useMemo(() => {
    if (config) return config;
    // Create a minimal config for initial render (SSR or before mount)
    // For SSR or before mount, use empty connectors array to avoid errors
    return createConfig({
      chains: [baseSepolia],
      transports: {
        [baseSepolia.id]: http('https://sepolia.base.org', {
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        }),
      },
      connectors: [], // Empty connectors for SSR/initial render
      ssr: typeof window === 'undefined' || !mounted, // Enable SSR for server-side or before mount
    });
  }, [config, mounted]);

  // Always render WagmiProvider to avoid WagmiProviderNotFoundError
  // The config will be updated once mounted and connectors are ready
  return (
    <WagmiProvider config={finalConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
