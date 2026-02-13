# ADR-0045 — ADR Governance Policy

## Status

ACCEPTED

## Context

The FitTrack ADR corpus has grown to 47 ADRs covering domain, infrastructure, security, operational, and compliance concerns. Without a formal governance policy, ADRs become outdated without notice, conflicting decisions persist unresolved, implicit supersessions cause confusion, and new team members lack a clear process for proposing or challenging decisions. This ADR defines how the ADR corpus is governed, amended, and extended.

## Decision

### 1. ADR Status Values

Every ADR must carry one of the following status values:

| Status | Meaning |
|--------|---------|
| **PROPOSED** | Draft under review. Not yet binding. |
| **ACCEPTED** | Approved and binding. All new code must comply. |
| **SUPERSEDED** | Replaced by a newer ADR. Historical reference only. Must include `Superseded by: ADR-XXXX`. |
| **DEPRECATED** | Decision is still in effect but scheduled for replacement. Active migration may be underway. |
| **FROZEN** | Accepted and permanently stable. Not subject to normal amendment process (requires extraordinary review). |

ADR-0000 is FROZEN.

### 2. ADR Numbering and Naming

- ADRs are numbered sequentially starting from 0000.
- Numbers are never reused. A superseded ADR retains its number and is marked SUPERSEDED.
- ADR titles follow the format: `ADR-XXXX — [Short Descriptive Title]`.
- Files are named: `adr-XXXX.md` (lowercase, zero-padded).

### 3. Proposing a New ADR

To propose a new ADR:
1. Create a new file with the next available number and status `PROPOSED`.
2. Include all mandatory sections: Status, Context, Decision, Invariants, Constraints, Consequences, Dependencies.
3. Submit for review via the project's code review process.
4. An ADR is ACCEPTED when approved by: at least one senior engineer and the technical lead (or equivalent).
5. Update the Dependencies sections of related ADRs to reference the new ADR.

### 4. Amending an Existing ADR

Minor amendments (clarifications, non-breaking additions):
- Edit the ADR file directly.
- Add a changelog entry at the bottom of the ADR: `## Changelog — YYYY-MM-DD: [Description of change]`.
- Submit via code review.

Major amendments (changing a decision, adding or removing an invariant):
- The amendment is significant enough that a new ADR should be considered.
- If the amendment is made in-place, it must be reviewed and approved as if it were a new ADR.

### 5. Superseding an ADR

When a decision is replaced:
1. Create a new ADR covering the replacement decision.
2. Update the original ADR's status to `SUPERSEDED`.
3. Add `Superseded by: ADR-XXXX` to the original ADR's Status section.
4. Add `Supersedes: ADR-XXXX` to the new ADR's Dependencies section.
5. All ADRs that referenced the superseded ADR in their Dependencies sections must be updated to reference the new ADR.

### 6. ADR Review Triggers

An ADR should be reviewed when:
- A new feature is being built that conflicts with or extends an existing ADR.
- A production incident reveals a flaw in a decision.
- External regulatory changes affect an ADR's compliance context.
- 2 years have elapsed since the ADR's last review (for ACCEPTED operational ADRs).
- A new team member identifies a material inconsistency or gap.

### 7. Invariants in ADRs

All ACCEPTED ADRs must contain a formally numbered Invariants section. Invariants are non-negotiable rules that all implementation must satisfy. They:
- Are testable (can be verified by code review or automated tests).
- Are binary (either satisfied or violated; no partial compliance).
- Are not aspirational (they describe current requirements, not goals).

If an invariant cannot be satisfied, the ADR must be amended before implementation proceeds.

### 8. ADR Corpus Index

A living index of all ADRs must be maintained in `docs/decisions/README.md`, listing:
- ADR number, title, status, and brief summary.
- Relationships between superseded and superseding ADRs.

The index is updated as part of every new or amended ADR.

## Invariants

1. Every ADR has a status value from the defined set (PROPOSED, ACCEPTED, SUPERSEDED, DEPRECATED, FROZEN).
2. Superseded ADRs carry a `Superseded by: ADR-XXXX` reference.
3. Every ACCEPTED ADR has a numbered Invariants section.
4. ADR numbers are never reused.
5. ADR-0000 is FROZEN and requires extraordinary review to amend.

## Constraints

- The ADR corpus is the authoritative source of architectural decisions. Architectural decisions made in code review comments, Slack, or email must be captured in an ADR before they are considered binding.
- ADRs are written in English to ensure accessibility to the full engineering team.
- ADRs are version-controlled alongside the codebase; ADR changes require code review approval.

## Consequences

**Positive:**
- Clear process for proposing, approving, and superseding decisions.
- Invariants are explicitly testable, not implied.
- New team members can understand the full decision history from the ADR corpus.

**Negative:**
- Process overhead for every architectural decision.
- Corpus maintenance (index, supersession tracking) requires ongoing discipline.

## Dependencies

- ADR-0000: Project Foundation (FROZEN; governs all other ADRs)
