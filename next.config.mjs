const isProd = process.env.NODE_ENV === "production";

// Pyodide (in-browser Python for the notebook) loads its runtime and packages from jsDelivr.
const PYODIDE_CDN = "https://cdn.jsdelivr.net";

const csp = [
  "default-src 'self'",
  // unsafe-inline: Next.js inline bootstrap scripts; unsafe-eval: React dev tooling only
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${PYODIDE_CDN}${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${PYODIDE_CDN}${isProd ? "" : " ws:"}`,
  // The notebook's module worker imports Pyodide from the CDN, which Chrome checks against worker-src.
  `worker-src 'self' blob: ${PYODIDE_CDN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // proxy.ts makes Next buffer request bodies, capped at 10 MB by default; dataset uploads
    // allow 50 MB (plus multipart overhead) and knowledge documents 20 MB.
    proxyClientMaxBodySize: "55mb",
  },
  async redirects() {
    return [{ source: "/templates", destination: "/agents", permanent: true }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
