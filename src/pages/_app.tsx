import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import '@/styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/wagmi';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const queryClient = new QueryClient();

// Set NEXT_PUBLIC_SITE_URL (e.g. https://signalvsnoise.xyz) in production so
// crawlers get an absolute og:image. Falls back to a relative path in dev.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
const ogImage = `${siteUrl}/og.png`;

// Privacy-friendly analytics (Umami or Plausible). Set these in Railway to
// activate; with them unset, no script loads and tracking is a no-op.
//   Umami:     NEXT_PUBLIC_ANALYTICS_SRC = https://cloud.umami.is/script.js
//              NEXT_PUBLIC_ANALYTICS_WEBSITE_ID = <your website id>
//   Plausible: NEXT_PUBLIC_ANALYTICS_SRC = https://plausible.io/js/script.js
//              NEXT_PUBLIC_ANALYTICS_DOMAIN = <your site domain>
const analyticsSrc    = process.env.NEXT_PUBLIC_ANALYTICS_SRC || '';
const analyticsSiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID || '';
const analyticsDomain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN || '';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#0ad9dc',
            accentColorForeground: '#001623',
            borderRadius: 'none',
            overlayBlur: 'small',
          })}
        >
          <Head>
            <title>Signal vs Noise</title>
            <meta
              name="description"
              content="Four players. Five clues. Only you know who's lying. An FHE-secured word-deduction game on Arbitrum Sepolia."
            />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.ico" />

            {/* Open Graph — link preview cards */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Signal vs Noise" />
            <meta property="og:title" content="Signal vs Noise" />
            <meta
              property="og:description"
              content="Four players. Five clues. Only you know who's lying. An FHE-secured word-deduction game on Arbitrum Sepolia."
            />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            {siteUrl && <meta property="og:url" content={siteUrl} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Signal vs Noise" />
            <meta name="twitter:description" content="Four players. Five clues. Only you know who's lying." />
            <meta name="twitter:image" content={ogImage} />
          </Head>
          {analyticsSrc && (analyticsSiteId || analyticsDomain) && (
            <Script
              src={analyticsSrc}
              strategy="afterInteractive"
              defer
              data-website-id={analyticsSiteId || undefined}
              data-domain={analyticsDomain || undefined}
            />
          )}
          <ToastProvider>
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
