/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Transpile packages that might have issues
  transpilePackages: ['react-is', 'lucide-react', '@creit.tech/stellar-wallets-kit'],
  // Security headers for wallet integration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://freighter.app https://albedo.link https://va.vercel-scripts.com; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://va.vercel-scripts.com *.stellar.org *.soroban.org https://*.onrender.com; object-src 'none';",
          },
        ],
      },
    ]
  },
  // GS1 Digital Link rewrites — enables worldwide scanner compatibility
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    return [
      {
        // GS1 Digital Link: /01/{gtin}/21/{serial}?qr=PRM-XXXX
        source: '/01/:gtin/21/:serial',
        destination: `${apiUrl}/qr/resolve/:serial`,
      },
    ]
  },
}

export default nextConfig
