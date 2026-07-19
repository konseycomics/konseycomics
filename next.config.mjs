/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://ahygyeikgmyqhcsfpoin.supabase.co https://cdn.konseycomics.com https://lh3.googleusercontent.com",
      "frame-src https://drive.google.com https://challenges.cloudflare.com",
      "connect-src 'self' https://ahygyeikgmyqhcsfpoin.supabase.co https://challenges.cloudflare.com wss://ahygyeikgmyqhcsfpoin.supabase.co",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ahygyeikgmyqhcsfpoin.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.konseycomics.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/kategori/manga',
        destination: '/seriler',
        permanent: true,
      },
      {
        source: '/kategori/webtoon',
        destination: '/seriler',
        permanent: true,
      },
      {
        source: '/topluluk/forum/:slug',
        destination: '/forum/:slug',
        permanent: true,
      },
      {
        source: '/forum/forum/:slug',
        destination: '/forum/:slug',
        permanent: true,
      },
      {
        source: '/topluluk/:path*',
        destination: '/forum/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
