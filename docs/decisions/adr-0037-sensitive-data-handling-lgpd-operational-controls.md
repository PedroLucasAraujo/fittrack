# ADR-0037 — Sensitive Data Handling — LGPD Operational Controls

## Status

ACCEPTED

## Context

FitTrack is the LGPD primary data controller (ADR-0028). The platform stores three categories of sensitive data: health and physiological metrics (Categoria A), financial records (Categoria B), and personal identification (Categoria C). Without formal operational controls, sensitive data may be unnecessarily collected, improperly stored, exposed in logs, or retained beyond legal obligations. This ADR defines the operational implementation of LGPD obligations established in ADR-0028.

## Decision

### 1. Data Category Classification

| Category | Data Types | Sensitivity Level | Lawful Basis |
|----------|-----------|------------------|-------------|
| **A — Health** | Execution records, physiological assessments, biometric metrics, training prescriptions, diet plans | Highest | Performance of contract |
| **B — Financial** | Transactions, payment status, credit balances, AccessGrant financial records | High | Legal obligation + performance of contract |
| **C — Identification** | Full name, email, phone number, national ID (CPF), address | High | Performance of contract + legitimate interest |
| **D — Operational** | Session tokens, audit log entries, scheduling data | Standard | Legitimate interest |

### 2. Data Minimization Controls

The platform collects only data necessary for the contracted service:
- No health data fields are created without a corresponding professional prescription.
- No marketing profiling of health or biometric data.
- No location tracking beyond what is required for service delivery.
- No behavioral tracking data beyond what is required for security and audit (ADR-0027).

### 3. Access Control by Data Category

| Role | Category A (Health) | Category B (Financial) | Category C (PII) |
|------|---------------------|----------------------|-----------------|
| CLIENT (own data) | Read own records only | Read own transactions only | Read and correct own PII |
| PROFESSIONAL | Read/write client records within active link | Read client billing status (no raw amounts) | Read client PII limited to operational fields |
| ADMIN | Read all (with AuditLog) | Read all (with AuditLog) | Read all (with AuditLog) |
| SYSTEM (automated) | Write Execution results | Write Transaction status | No access |

Health data access by a professional requires an active `ProfessionalClientLink`. Terminated links produce 404 responses for historical health data queries (access to historical records is configurable by platform policy).

### 4. Logging and PII Policy

Sensitive data must not appear in:
- Application logs (structured or unstructured).
- Error messages returned to clients.
- AuditLog entries (AuditLog contains reference IDs only; see ADR-0027).
- Analytics or monitoring dashboards.
- Cache entries (ADR-0030).

Fields explicitly prohibited from logs:
- Full name, email, phone, national ID.
- Health metric values, biometric measurements.
- Financial amounts, card details, bank account numbers.
- Passwords, tokens, or session identifiers.

### 5. LGPD Data Subject Request Handling

| Request Type | Platform Response | Time Limit |
|-------------|------------------|-----------|
| Access (export) | JSON export of personal data via authenticated API endpoint | Within 15 days |
| Correction | API endpoint for PII field correction | Within 15 days |
| Anonymization | Field-level anonymization per ADR-0013 | Within 30 days |
| Portability | Structured JSON export | Within 15 days |
| Erasure | Anonymization of PII fields; Tier 1 entity structure retained | Within 30 days |
| Information | Privacy policy and data processing documentation | Immediately (published) |
| Consent revocation | Account deactivation; financial and execution history retained per legal obligation | Within 5 days |

Tier 1 entities (Execution, Transaction, AuditLog) are retained after erasure requests per legal obligation. Only PII fields within those records are anonymized.

### 6. Data Retention in Practice

| Data Type | Retention | Disposal |
|-----------|-----------|---------|
| Execution records (structure) | Permanent | Never deleted |
| Transaction records (structure) | Minimum 5 years | Anonymized after legal minimum |
| AuditLog entries | Minimum 5 years | Never deleted |
| UserProfile PII | Until erasure request + legal minimum | Anonymized on request |
| Session tokens | Until expiry | Deleted on expiry |
| Scheduling data | Until professional closure + 90 days | Soft-deleted |

### 7. Sensitive Data in Transit

All API endpoints handling Category A, B, or C data must use TLS 1.2+. No sensitive data is transmitted over unencrypted HTTP in any environment (staging or production). This is enforced at the infrastructure layer per ADR-0028.

## Invariants

1. Health metric values never appear in logs, error responses, or AuditLog entries.
2. Financial amounts never appear in logs or AuditLog entries (only transactionId and type).
3. PII (name, email, phone, national ID) never appears in AuditLog entries.
4. LGPD erasure requests produce field-level anonymization; Tier 1 entity structure is never deleted.
5. Health data access by a professional requires an active ProfessionalClientLink.

## Constraints

- Data minimization is enforced at the API level: endpoints that accept health or PII data must validate that only necessary fields are present.
- The platform must not store Category A or B data in any third-party analytics service without explicit LGPD basis and data processing agreement.
- All consent records must themselves be retained as evidence of lawful basis.

## Consequences

**Positive:**
- Operationally compliant LGPD data handling.
- Clear data lifecycle per category reduces legal exposure.
- Auditability of all sensitive data access.

**Negative:**
- Operational overhead for LGPD request processing.
- Anonymization procedures require engineering maintenance.

## Dependencies

- ADR-0013: Soft Delete and Data Retention Policy (retention tiers and anonymization procedure)
- ADR-0024: Policy-Based Authorization (access control by role)
- ADR-0025: Multi-Tenancy and Data Isolation (professional access scoped to client link)
- ADR-0027: Audit and Traceability (AuditLog PII policy)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (LGPD role classification and obligations)
- ADR-0030: Cache and Performance Strategy (sensitive data cache prohibition)
