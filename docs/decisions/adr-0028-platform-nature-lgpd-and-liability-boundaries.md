# ADR-0028 — Platform Nature, LGPD, and Liability Boundaries

## Status

ACCEPTED

## Context

FitTrack operates as a digital marketplace intermediating between fitness professionals and their clients. The platform handles sensitive data categories: health metrics, physiological assessments, financial transactions, and personal identification. Incorrect characterization of the platform's legal role exposes it to liability for professional malpractice, clinical decisions, and financial disputes it does not control.

## Decision

### 1. Platform Legal Classification

FitTrack is a **marketplace intermediary** — not a healthcare provider, not a clinical institution, and not a financial institution. The platform provides infrastructure for professionals to deliver services to clients.

### 2. Liability Boundaries

| Area | Platform Role | Platform Responsibility |
|------|--------------|------------------------|
| Service content | Infrastructure provider | None for content quality or clinical validity |
| Professional qualifications | Onboarding verification only | None for professional competency post-onboarding |
| Health outcomes | Logging infrastructure | None for health outcomes or clinical results |
| Financial disputes | Intermediary | Limited to processing payment disputes through gateway; not liable for outcome |
| Data security | Primary data controller | Full responsibility under LGPD |
| Data accuracy | Data processor | Stores what is provided; does not validate accuracy |

### 3. LGPD Role Classification

Under the Brazilian General Data Protection Law (LGPD — Lei 13.709/2018):

| Role | Entity | Scope |
|------|--------|-------|
| **Primary Data Controller** | FitTrack Platform | Determines purpose and means of processing all personal data |
| **Authorized Operator** | Professional (ProfessionalProfile) | Processes client data under the professional relationship |
| **Data Subject** | Client (user) | Rights: access, correction, anonymization, portability, erasure |

FitTrack as primary controller must:
- Maintain records of processing activities.
- Ensure data security (encryption in transit and at rest).
- Respond to data subject requests within the LGPD-mandated timeframe.
- Appoint a Data Protection Officer (DPO) when required by regulation.

### 4. Platform Non-Interpretation Rule

**The platform does not validate, interpret, or assume responsibility for the clinical or technical quality of professional content.**

Specifically:
- Training prescriptions are stored as data. The platform does not evaluate their clinical safety.
- Diet plans are stored as data. The platform does not evaluate their nutritional appropriateness.
- Physiological metrics are stored as reported. The platform does not interpret them medically.
- The platform's risk governance (ADR-0022) governs financial and operational risk, not clinical risk.

### 5. LGPD Data Subject Rights Implementation

| Right | Platform Response |
|-------|-----------------|
| Right to access | API endpoint for data subject to download their own data |
| Right to correction | API endpoint for data subject to correct PII fields |
| Right to anonymization | Anonymization procedure (per ADR-0013 Section 5); not deletion |
| Right to portability | JSON export of the data subject's personal data |
| Right to erasure | Anonymization of PII fields; structural records retained for legal compliance |
| Right to information | Privacy policy and data processing records |
| Right to revocation of consent | Deactivates account; does not delete financial/execution history |

### 6. Data Processing Lawful Basis

| Data Category | Lawful Basis under LGPD |
|--------------|------------------------|
| Health metrics (Execution records) | Performance of contract (professional-client service agreement) |
| Financial data (Transaction, AccessGrant) | Legal obligation (financial regulation) |
| Personal identification (UserProfile PII) | Performance of contract; legitimate interest |
| Marketing preferences | Explicit consent |
| Audit logs (access records) | Legitimate interest (security, fraud prevention) |

### 7. Data Minimization Principle

The platform collects only data that is necessary for the contracted service:
- No unnecessary physiological data fields beyond what the professional has prescribed.
- No tracking data beyond what is required for service delivery audit.
- No marketing profiling of health data.

### 8. Data Security Obligations

| Obligation | Implementation |
|-----------|---------------|
| Encryption in transit | TLS 1.2+ for all API communications |
| Encryption at rest | Database encryption at rest (provider-managed) |
| Access logging | AuditLog for all access to sensitive data (ADR-0027) |
| Breach notification | 72-hour notification to ANPD upon confirmed breach |

## Invariants

1. The platform never assumes clinical, nutritional, or professional responsibility for content stored in the system.
2. LGPD erasure requests produce field-level anonymization, never structural record deletion for Tier 1 or Tier 2 entities.
3. Financial and Execution records are retained despite LGPD erasure requests (legal obligation overrides erasure right).
4. Professional data on the platform is always attributed to the professional, not claimed by the platform.
5. The platform is the LGPD primary data controller. No professional or third party may claim primary controller status for platform-managed data.

## Constraints

- Platform terms of service must clearly state the marketplace intermediary nature and limitation of liability.
- Data retention minimums (ADR-0013) must comply with Brazilian financial regulation (minimum 5 years for financial records).
- The platform's LGPD compliance documentation must be reviewed by legal counsel before production launch.

## Consequences

**Positive:**
- Clear legal boundary between platform liability and professional liability.
- Correct LGPD classification reduces regulatory risk.
- Explicit non-interpretation rule protects the platform from clinical liability claims.

**Negative:**
- Platform bears full data security liability as primary controller.
- LGPD compliance requires ongoing operational processes (DPO, breach notification).

## Dependencies

- ADR-0000: Project Foundation (platform non-interpretation principle, LGPD primary controller)
- ADR-0013: Soft Delete and Data Retention Policy (LGPD erasure implementation)
- ADR-0027: Audit and Traceability (access logging obligation)
- ADR-0037: Sensitive Data Handling (LGPD operational controls)
