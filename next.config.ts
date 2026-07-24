import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async headers() {
    const scriptSrc=process.env.NODE_ENV==="production"?"script-src 'self' 'unsafe-inline'":"script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    const csp=["default-src 'self'",scriptSrc,"style-src 'self' 'unsafe-inline'","img-src 'self' data: https://images.unsplash.com https://*.cloudflarestream.com https://*.videodelivery.net","font-src 'self'","connect-src 'self' https://upload.videodelivery.net https://*.cloudflarestream.com https://*.videodelivery.net","frame-src https://*.cloudflarestream.com https://*.videodelivery.net","frame-ancestors 'none'","base-uri 'self'","form-action 'self'","object-src 'none'","upgrade-insecure-requests"].join("; ");
    return [{source:"/(.*)",headers:[
      {key:"Content-Security-Policy",value:csp},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
      {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains; preload"},
    ]}];
  },
  experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
