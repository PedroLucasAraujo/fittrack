# ADR-0023 — Authentication, Sessions, and Token Management

## Status

ACCEPTED

## Context

FitTrack serves multiple user types (clients, professionals, admins) with different permission scopes. Authentication must be secure, stateless at the application level, and support token revocation for security-sensitive events (RiskStatus changes, logout, account suspension).

## Decision

### 1. Authentication Mechanism

The platform uses **JWT (JSON Web Tokens)** for authentication with a short-lived access token and a long-lived refresh token with rotation.

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 15 minutes | Client memory (not persistent storage) |
| Refresh Token | 30 days | Secure HTTP-only cookie or server-side store |

Access token lifetime is short to minimize exposure from token theft. Refresh token rotation ensures that stolen refresh tokens are detected on next use.

### 2. JWT Access Token Claims

```typescript
interface AccessTokenPayload {
  sub: string;              // userId (subject)
  roles: UserRole[];        // ['CLIENT'] | ['PROFESSIONAL'] | ['ADMIN']
  profileId: string | null; // professionalProfileId (if PROFESSIONAL role) or null
  tenantId: string | null;  // professionalProfileId (for multi-tenant scoping)
  riskStatus: RiskStatus;   // Current RiskStatus of the subject
  iss: string;              // Issuer ('fittrack-api')
  iat: number;              // Issued at (UTC epoch seconds)
  exp: number;              // Expiry (UTC epoch seconds)
  jti: string;              // JWT ID (unique per token)
}
```

### 3. Refresh Token Rotation Protocol

```
Client sends refresh token RT_n
  → Server validates RT_n (not expired, not revoked, matches stored hash)
  → Server generates new access token AT_{n+1}
  → Server generates new refresh token RT_{n+1}
  → Server stores hash of RT_{n+1}; marks RT_n as consumed
  → Server returns AT_{n+1} and RT_{n+1} to client

If RT_n has already been consumed (potential token theft):
  → Invalidate all refresh tokens for this userId
  → Require re-authentication
  → Log security event to AuditLog
```

### 4. Session Revocation Events

The following events trigger immediate refresh token revocation for the affected user's active sessions:

| Event | Revocation Scope |
|-------|-----------------|
| Explicit logout | Revoke current refresh token only |
| Password change | Revoke all active refresh tokens for userId |
| `RiskStatusChanged` (to BANNED) | Revoke all active refresh tokens for the professional's userId |
| Account suspension | Revoke all active refresh tokens for userId |
| Admin-initiated security override | Revoke all active refresh tokens for userId |

Access tokens in circulation remain valid until their natural expiry (≤ 15 minutes). The short lifetime bounds the exposure window for revoked tokens.

### 5. User Role Model

| Role | Scope | Capabilities |
|------|-------|-------------|
| `CLIENT` | Own profile, own sessions, own Executions | View own data; book sessions; view history |
| `PROFESSIONAL` | Own profile, own service plans, own clients' data | Manage plans; create Executions for own clients; view own analytics |
| `ADMIN` | Platform-wide (with audit logging) | Access any tenant data; manage risk; view all records |

A user may hold only one primary role at a time. Role is set at account creation and not dynamically changeable at the token level.

### 6. Token Claims and Multi-Tenancy

- `tenantId` in the access token is the `professionalProfileId` of the authenticated professional.
- For CLIENT role: `tenantId` is null. Client data is scoped by the `professionalProfileId` of the professional the client is linked to (resolved at the application layer via repository query, not from the token).
- For ADMIN role: `tenantId` is null. Admin access is explicitly scoped at the application layer.

### 7. Security Constraints

| Constraint | Requirement |
|-----------|------------|
| Password storage | bcrypt (minimum 12 rounds); never plaintext or reversible encryption |
| Token signing | RS256 (asymmetric) for JWT signing; private key never exposed |
| HTTPS | All authentication endpoints are HTTPS only |
| Rate limiting | Login endpoint is rate-limited (governed by ADR-0026) |
| No client-side validation | Token validity is never evaluated on the client side alone |

## Invariants

1. Access tokens expire in ≤ 15 minutes. No access token with a longer lifetime is issued.
2. Refresh token rotation is mandatory. A refresh token is consumed on use and replaced with a new one.
3. Token revocation events (logout, BANNED, suspension) immediately invalidate all refresh tokens for the affected user.
4. Passwords are stored only as bcrypt hashes. No plaintext or weakly-hashed passwords are persisted.
5. JWT signing uses asymmetric RS256. The private key is an environment secret (ADR-0032).

## Constraints

- JWT claims must not include sensitive PII (full name, email, phone) in access tokens. Reference IDs only.
- Token claims must not include health data, financial data, or metric values.
- No persistent session state is stored in the application server process (stateless application, governed by ADR-0035).

## Consequences

**Positive:**
- Short access token lifetime bounds the exposure window for token theft.
- Refresh token rotation detects and mitigates token theft.
- Stateless application layer simplifies horizontal scaling.

**Negative:**
- Refresh token rotation requires server-side token store (adds infrastructure dependency).
- 15-minute access token expiry requires frontend to handle token refresh transparently.

## Dependencies

- ADR-0000: Project Foundation (security model)
- ADR-0022: Financial Risk Governance Framework (RiskStatus → token revocation)
- ADR-0024: Policy-Based Authorization (role enforcement)
- ADR-0026: Rate Limiting and Security Policies (login rate limiting)
- ADR-0032: Deploy, Environments, and Configuration (JWT private key management)
- ADR-0035: Horizontal Scalability Strategy (stateless session model)
