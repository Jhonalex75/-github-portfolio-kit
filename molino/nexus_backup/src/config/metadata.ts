/**
 * SEO and Metadata Configuration
 * Centralizes all metadata definitions for the application
 */

export const siteMetadata = {
  title: 'CyberEngineer Nexus | Next-Gen Engineering Hub',
  description: 'AI-Powered Design, Research, and Simulation for the Modern Engineer',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus.example.com',
  language: 'es-ES',
  author: 'MSC. ING. Jhon Alexander Valencia Marulanda',
  twitter: {
    handle: '@nexus',
    site: '@nexus',
    creator: '@nexus',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus.example.com',
    title: 'CyberEngineer Nexus | Next-Gen Engineering Hub',
    description: 'AI-Powered Design, Research, and Simulation for the Modern Engineer',
    image: {
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexus.example.com'}/og-image.png`,
      width: 1200,
      height: 630,
      alt: 'CyberEngineer Nexus',
    },
  },
};

export const scrollBehavior = 'smooth';

export const themes = {
  dark: 'dark',
  light: 'light',
} as const;

export const breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  widescreen: 1280,
};

export const analytics = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  gaId: process.env.NEXT_PUBLIC_GA_ID,
};

export const errorTracking = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_ERROR_LOGGING === 'true',
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
};
