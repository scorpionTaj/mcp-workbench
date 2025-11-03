# Security Implementation Guide

This document explains the security features implemented in MCP Workbench and how to use them.

## 🔒 Security Features

### 1. API Key Encryption at Rest

All API keys stored in the database are encrypted using AES-256 encryption.

**Implementation:**

- Location: `lib/encryption.ts`
- Algorithm: AES-256
- Functions: `encrypt()`, `decrypt()`

**Setup:**

1. Generate a strong encryption key:
   ```bash
   openssl rand -base64 32
   ```
2. Add to your `.env` file:
   ```
   ENCRYPTION_KEY="your-generated-key-here"
   ```
3. **CRITICAL:** Never commit this key to version control!

**Usage:**

```typescript
import { encrypt, decrypt } from '@/lib/encryption';

// Encrypt before storing
const encryptedKey = encrypt(apiKey);
await prisma.providerConfig.create({ apiKey: encryptedKey });

// Decrypt when retrieving
const config = await prisma.providerConfig.findUnique({ ... });
const decryptedKey = decrypt(config.apiKey);
```

### 2. Rate Limiting

Protects API endpoints from abuse and DoS attacks using in-memory rate limiting.

**Implementation:**

- Location: `lib/rate-limit.ts`
- Library: `rate-limiter-flexible`

**Rate Limit Tiers:**

- **Strict**: 5 requests/minute (auth endpoints)
- **Standard**: 30 requests/minute (API endpoints)
- **Relaxed**: 100 requests/minute (read-only)

**Usage:**

```typescript
import { withRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async (req) => {
      // Your handler logic
      return NextResponse.json({ success: true });
    },
    "standard" // or 'strict' or 'relaxed'
  );
}
```

**Response Headers:**

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: When the limit resets
- `Retry-After`: Seconds to wait (on 429 errors)

### 3. CSRF Protection

Prevents Cross-Site Request Forgery attacks on state-changing operations.

**Implementation:**

- Location: `lib/csrf.ts`
- Protects: POST, PUT, DELETE, PATCH requests

**How it works:**

1. Client fetches CSRF token from `/api/security/csrf`
2. Token is stored in httpOnly cookie
3. Client includes token in `x-csrf-token` header
4. Server validates cookie matches header

**Client-side usage:**

```typescript
// 1. Fetch CSRF token
const response = await fetch("/api/security/csrf");
const { token } = await response.json();

// 2. Include in requests
await fetch("/api/providers/config", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": token,
  },
  body: JSON.stringify(data),
});
```

**Server-side usage:**

```typescript
import { withCsrfProtection } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async (req) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  });
}
```

### 4. Security Headers

Comprehensive HTTP security headers to prevent common web vulnerabilities.

**Implementation:**

- Location: `next.config.mjs`

**Headers Implemented:**

#### X-Frame-Options

Prevents clickjacking attacks

```
X-Frame-Options: DENY
```

#### X-Content-Type-Options

Prevents MIME type sniffing

```
X-Content-Type-Options: nosniff
```

#### X-XSS-Protection

Enables browser XSS protection

```
X-XSS-Protection: 1; mode=block
```

#### Content-Security-Policy (CSP)

Prevents XSS, injection attacks, and unauthorized resource loading

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' http://localhost:* ws://localhost:*;
  frame-ancestors 'none';
```

#### Strict-Transport-Security (HSTS)

Forces HTTPS connections (production only)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### Referrer-Policy

Controls referrer information

```
Referrer-Policy: strict-origin-when-cross-origin
```

#### Permissions-Policy

Restricts browser features

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 5. CORS Configuration

Controls cross-origin resource sharing for API endpoints.

**Configuration:**

- Location: `next.config.mjs`
- Endpoint: `/api/*`

**Environment Variable:**

```bash
ALLOWED_ORIGIN="https://your-production-domain.com"
```

**Headers:**

- `Access-Control-Allow-Origin`: Configurable via env
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, PATCH, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization, x-csrf-token

## 🛡️ Security Best Practices

### For Development

1. **Use .env.example as template**

   ```bash
   cp .env.example .env
   ```

2. **Generate strong encryption key**

   ```bash
   openssl rand -base64 32
   ```

3. **Never commit secrets**
   - `.env` is in `.gitignore`
   - Use environment variables for all secrets

### For Production

1. **Set strong encryption key**

   - Use a cryptographically secure random key
   - Store in secure secrets management (e.g., Vercel env vars, AWS Secrets Manager)

2. **Configure CORS properly**

   ```bash
   ALLOWED_ORIGIN="https://your-domain.com"
   ```

3. **Enable HSTS**

   - Automatic in production (`NODE_ENV=production`)

4. **Use HTTPS only**

   - Never run production over HTTP
   - Consider using a reverse proxy (nginx, Cloudflare)

5. **Regular security audits**

   ```bash
   npm audit
   bun audit
   ```

6. **Update dependencies regularly**

   ```bash
   bun update
   ```

7. **Monitor rate limit violations**
   - Check for unusual patterns
   - Adjust limits based on legitimate usage

## 🔍 Testing Security Features

### Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..10}; do curl http://localhost:3000/api/providers; done
```

### Test CSRF Protection

```bash
# This should fail without CSRF token
curl -X POST http://localhost:3000/api/providers/config \
  -H "Content-Type: application/json" \
  -d '{"provider":"test"}'
```

### Test Security Headers

```bash
curl -I http://localhost:3000
```

### Test Encryption

```typescript
import { encrypt, decrypt } from "@/lib/encryption";

const original = "my-secret-api-key";
const encrypted = encrypt(original);
const decrypted = decrypt(encrypted);

console.log(original === decrypted); // true
console.log(original === encrypted); // false
```

## ⚠️ Important Notes

1. **Encryption Key Rotation**

   - Changing `ENCRYPTION_KEY` will invalidate all stored API keys
   - Plan a migration strategy if rotation is needed

2. **Rate Limiting Storage**

   - Currently uses in-memory storage
   - Resets on server restart
   - Consider Redis for distributed systems

3. **CSRF Token Lifetime**

   - Tokens are session-based
   - Stored in httpOnly cookies
   - Expire on browser close

4. **CSP Limitations**
   - Current policy allows `unsafe-inline` for styles
   - Required for Next.js and some UI libraries
   - Consider tightening for production

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy](https://content-security-policy.com/)

## 🐛 Troubleshooting

### "Encryption error" when decrypting

- Verify `ENCRYPTION_KEY` is set correctly
- Ensure the key hasn't changed since encryption
- Check for data corruption in database

### Rate limit 429 errors

- Wait for the retry-after period
- Check if legitimate traffic is being blocked
- Adjust rate limits in `lib/rate-limit.ts`

### CSRF validation failed

- Ensure CSRF token is fetched before POST requests
- Verify `x-csrf-token` header is included
- Check cookies are enabled

### CSP violations

- Check browser console for CSP errors
- Adjust policy in `next.config.mjs`
- Add specific domains to allowed sources

## 🔐 Security Checklist

Before deploying to production:

- [ ] Strong `ENCRYPTION_KEY` set in environment
- [ ] `ALLOWED_ORIGIN` configured for production domain
- [ ] All secrets removed from code and config files
- [ ] HTTPS enforced
- [ ] Dependencies audited and updated
- [ ] Rate limits tested and adjusted
- [ ] CSRF protection tested on all forms
- [ ] Security headers verified
- [ ] Database backups configured
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured (but not logging secrets!)
- [ ] Monitoring and alerting set up
