# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Prismo Finance, please report it responsibly:

1. **Do NOT** disclose the vulnerability publicly
2. Email security concerns to the development team
3. Include detailed steps to reproduce the issue
4. Allow reasonable time for a fix before disclosure

## Security Measures Implemented

### 1. HTTP Security Headers

All responses include the following security headers:

- **X-Frame-Options: DENY** - Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff** - Prevents MIME-type sniffing
- **X-XSS-Protection: 1; mode=block** - Enables XSS filtering
- **Referrer-Policy: strict-origin-when-cross-origin** - Controls referrer information
- **Strict-Transport-Security** - Enforces HTTPS connections
- **Content-Security-Policy** - Restricts resource loading
- **Permissions-Policy** - Disables unnecessary browser features

### 2. Authentication

- Stack Auth (Neon Auth) for secure authentication
- Support for OAuth (Google) and Passkeys
- Session tokens with secure cookie settings
- Protected routes require authentication

### 3. Rate Limiting

API endpoints implement rate limiting to prevent abuse:

- **Auth endpoints**: 10 requests/minute (prevent brute force)
- **AI chat**: 30 requests/minute
- **General API**: 100 requests/minute
- **Sensitive operations**: 5 requests/minute

### 4. Input Validation

- All inputs validated with Zod schemas
- Maximum length limits on all string inputs
- UUID validation for IDs
- Amount validation with reasonable ranges
- Date validation with reasonable ranges

### 5. Database Security

- Drizzle ORM with parameterized queries (prevents SQL injection)
- No raw SQL with string interpolation
- User data isolation (all queries filtered by userId)

### 6. Image Domain Restrictions

Only trusted image domains are allowed:

- Stack Auth profile images
- Appwrite storage
- GitHub avatars
- Google user content
- Placeholder services

### 7. Sensitive Data Protection

- Environment variables for all secrets
- API keys encrypted at rest
- Passwords hashed (handled by Stack Auth)
- Sensitive data masked in logs

## Known Vulnerabilities

### Dependencies (Low/Moderate Severity)

1. **cookie < 0.7.0** (in @stackframe/stack)
   - Severity: Low
   - Status: Waiting for upstream fix
   - Mitigation: Not exploitable in current usage

2. **esbuild <= 0.24.2** (in drizzle-kit - dev dependency)
   - Severity: Moderate
   - Status: Dev dependency only, not in production
   - Mitigation: Only affects local development

## Best Practices for Development

1. Never commit `.env` files (already in .gitignore)
2. Use environment variables for all secrets
3. Validate all user inputs with Zod
4. Use parameterized queries (Drizzle ORM)
5. Check authentication on all protected endpoints
6. Add rate limiting to new API endpoints
7. Review security headers before deployment

## Compliance

- PDPA (Malaysia) compliant
- HTTPS enforced in production
- Secure cookie settings

## Updates

This security policy is reviewed and updated regularly. Last updated: December 2024
