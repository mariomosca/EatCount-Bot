/** @type {import('next').NextConfig} */

// Validazione env obbligatori a build/startup time
const requiredEnv = ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'DIET_API_KEY'];

if (process.env.NODE_ENV !== 'test') {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.warn(`[DietLogger Web] WARNING: missing env var ${key}`);
    }
  }
}

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react'],
  },
  // Proxy API calls verso backend in dev (evita CORS)
  // In prod usa NEXT_PUBLIC_DIET_API_URL direttamente
  async rewrites() {
    const backendUrl = process.env.DIET_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
