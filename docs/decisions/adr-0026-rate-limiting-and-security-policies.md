# ADR-0026 — Rate Limiting and Security Policies

## Status

ACCEPTED

## Context

FitTrack exposes public and authenticated endpoints subject to abuse: brute-force login attacks, API scraping, webhook flooding, and booking spam. Without rate limiting and baseline security controls, the platform is vulnerable to denial of service (DoS) at the application layer, credential stuffing, and resource exhaustion.

## Decision

### 1. Rate Limiting Strategy

Rate limiting is applied at three tiers:

**Tier 1 — Public endpoints (unauthenticated):**

| Endpoint | Limit | Window |
|---------|-------|--------|
| POST /auth/login | 5 attempts | per IP per 15 minutes |
| POST /auth/register | 10 requests | per IP per hour |
| POST /auth/refresh | 20 requests | per IP per hour |
| GET /service-plans (public catalog) | 100 requests | per IP per minute |

**Tier 2 — Authenticated endpoints:**

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Booking creation | 20 requests | per userId per minute |
| Purchase creation | 10 requests | per userId per 15 minutes |
| Execution creation | 30 requests | per userId per minute |
| Read endpoints | 200 requests | per userId per minute |
| File upload | 5 requests | per userId per minute |

**Tier 3 — Webhook endpoints:**

| Endpoint | Limit | Window |
|---------|-------|--------|
| POST /webhooks/payment | 100 requests | per source IP per minute |

All limits are configurable via environment configuration (ADR-0032).

### 2. Progressive Blocking for Login

Failed login attempts trigger progressive blocking:

| Consecutive Failures | Response |
|---------------------|---------|
| 1–5 | Normal rate limiting |
| 6–10 | 2-minute block per IP |
| 11–20 | 15-minute block per IP |
| >20 | 1-hour block per IP + AuditLog alert |

Account-level lockout (in addition to IP-level) applies after 10 consecutive failures from any IP:
- Account is soft-locked for 30 minutes.
- User receives lockout notification email.
- Lockout event is logged in AuditLog.

### 3. Security Headers

All API responses must include:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | Restrictive policy (no inline scripts) |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### 4. Input Validation

- All inputs are validated at the presentation layer before reaching the application layer.
- Validation failures return HTTP 422 with structured error details.
- No raw user input is interpolated into SQL queries (parameterized queries only).
- No raw user input is interpolated into HTML responses (XSS prevention).

### 5. Rate Limit Headers

Rate-limited responses include:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1714579200
Retry-After: 60
```

A request that exceeds the rate limit returns HTTP 429.

### 6. Rate Limiting Storage

Rate limit counters are stored in a distributed cache (Redis), not in the application process. This ensures rate limits are enforced consistently across multiple application instances (ADR-0035).

### 7. Scope of Rate Limiting

Rate limiting is not a substitute for:
- Authentication (rate limiting does not authenticate users).
- Authorization (rate limiting does not enforce permissions).
- Input validation (rate limiting does not sanitize input).
- Idempotency (rate limiting does not prevent duplicate operations).

All four controls are required independently.

## Invariants

1. Rate limit configuration is environment-driven (ADR-0032). Default values are conservative.
2. Rate limit counters are shared across all application instances (stored in distributed cache).
3. Login brute-force protection applies at both IP level and account level simultaneously.
4. Rate limiting never modifies domain state. It is a purely pre-execution guard.
5. HTTP 429 is the exclusive response for rate limit exceeded. No domain exception is raised.

## Constraints

- Rate limiting is implemented at the infrastructure/middleware layer, not the application or domain layer.
- IP-based rate limiting alone is insufficient for authenticated endpoints. User ID-based limiting is mandatory for authenticated endpoints.
- Webhook endpoints use source IP limiting only (no authenticated user context available at validation time).

## Consequences

**Positive:**
- Brute-force and credential stuffing attacks are mitigated.
- API resource exhaustion attacks are bounded.
- Webhook flooding is bounded at the infrastructure layer.

**Negative:**
- Legitimate high-frequency users may hit limits; monitoring required.
- Distributed cache dependency added.

## Dependencies

- ADR-0023: Authentication, Sessions, and Token Management (login endpoint)
- ADR-0032: Deploy, Environments, and Configuration (rate limit values as config)
- ADR-0033: Security Policies and Defense-in-Depth (complementary security controls)
- ADR-0035: Horizontal Scalability Strategy (distributed rate limit state)
