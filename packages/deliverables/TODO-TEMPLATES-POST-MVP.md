# TODO — Deliverable Templates: Post-MVP Backlog

This file tracks intentional scope deferral for the Deliverable Templates feature.
Items here are **not bugs** — they are valid features excluded from the MVP scope.

---

## 1. Template Sharing / Library

**Context**: Templates are currently scoped to a single `professionalProfileId` (ADR-0025).
**Deferred**: Allow professionals to share templates with their organisation/team, or publish to a public library.

- [ ] Introduce a `visibility` field: `PRIVATE | ORGANIZATION | PUBLIC`
- [ ] `IDeliverableTemplateRepository.findPublicByType()` query
- [ ] ADR update: cross-tenant read policy for public templates (read-only, copy-on-instantiate)
- [ ] Import/fork mechanism: copying a public template into one's own library (creates new DRAFT with `previousVersionId = null`)

---

## 2. Parameterised Template Instantiation (Advanced)

**Context**: `TemplateParameter[]` and `parameterValues` are modelled but the `toSnapshot()` method
currently ignores parameter substitution (exercises/foods are static).
**Deferred**: Dynamic substitution of named placeholders in template structures using `parameterValues`.

- [ ] Define placeholder syntax for exercise names/notes (e.g. `{{weeks}}`)
- [ ] Implement interpolation in `WorkoutTemplateStructure.toSnapshot(paramMap)`
- [ ] Implement interpolation in `DietTemplateStructure.toSnapshot(paramMap)`
- [ ] Unit tests for parameter substitution edge cases (missing param, wrong type, boundary values)

---

## 3. Soft-Delete / Trash

**Context**: `ARCHIVED` is terminal but not equivalent to deletion. Professionals may want to remove clutter.
**Deferred**: Add a `deletedAtUtc` field and filter deleted templates from all queries.

- [ ] Add `softDelete(): DomainResult<void>` to `DeliverableTemplate` (only from `ARCHIVED`)
- [ ] Update all repository query methods to exclude soft-deleted records
- [ ] Retention policy: hard-delete after N days (configurable per tenant)

---

## 4. Duplicate / Clone Template

**Context**: No use case exists for cloning a template (copy name + structure into new DRAFT).
**Deferred**: `CloneDeliverableTemplate` use case.

- [ ] `CloneDeliverableTemplate` — creates new DRAFT from any status, resets `version` to 1, `usageCount` to 0
- [ ] DTO: `sourceTemplateId`, optional `newName`
- [ ] Uniqueness check: clone name must not conflict

---

## 5. Template Tags / Categorisation

**Context**: `tags: string[]` field exists on the aggregate but no query by tag is implemented.
**Deferred**: Search/filter templates by tags.

- [ ] `IDeliverableTemplateRepository.findByTag(professionalProfileId, tag)` query method
- [ ] Validation: max 10 tags, max 50 chars each, lowercase normalisation
- [ ] Expose tag filter in `ListDeliverableTemplates` use case

---

## 6. Template Usage Analytics

**Context**: `usageCount` is incremented on instantiation but there is no time-series data.
**Deferred**: Per-template instantiation history and trend analytics.

- [ ] `TemplateInstantiationLog` read model (projection from `DeliverableTemplateInstantiatedEvent`)
- [ ] Queries: instantiation count per month, last used at, top-N templates
- [ ] Respect ADR-0037: no PII or health data in analytics projections

---

## 7. Template Versioning UI Diff

**Context**: `previousVersionId` forms a linked chain of versions but no diff API exists.
**Deferred**: Expose a `GetTemplateVersionChain` use case and a diff/changelog view.

- [ ] `GetTemplateVersionChain` — traverses `previousVersionId` chain and returns ordered list
- [ ] Diff engine: compare `structure` snapshots between consecutive versions
- [ ] Maximum chain depth guard (e.g., 50 versions) to prevent O(n) traversal without pagination

---

## 8. Bulk Archive

**Context**: No use case for archiving multiple templates at once.
**Deferred**: `BulkArchiveDeliverableTemplates` use case for housekeeping.

- [ ] Input: `templateIds: string[]`, `professionalProfileId: string`
- [ ] Max batch size: 50 templates per request
- [ ] Partial success semantics: return success + failure lists

---

## 9. Infrastructure Layer

**Context**: Only in-memory repositories exist (test layer). Prisma repositories are not implemented.
**Deferred**: Production Prisma implementations.

- [ ] `PrismaDeliverableTemplateRepository` implementing `IDeliverableTemplateRepository`
- [ ] Prisma schema migration: `DeliverableTemplate` table with `structure` as JSONB
- [ ] `originTemplateId` and `originTemplateVersion` columns on `Deliverable` table
- [ ] Index: `(professionalProfileId, status)` for `findActiveByProfessional`
- [ ] Index: `(professionalProfileId, type)` for `findByType`
- [ ] Index: `(professionalProfileId, name)` for `existsByProfessionalAndName` uniqueness guard

---

## 10. HTTP / API Layer

**Context**: Use cases are implemented but no HTTP controllers or routes exist.
**Deferred**: REST endpoints for template management.

- [ ] `POST /templates` → `CreateDeliverableTemplate`
- [ ] `GET /templates` → `ListDeliverableTemplates` (query params: `activeOnly`, `type`)
- [ ] `GET /templates/:id` → `GetDeliverableTemplate`
- [ ] `PATCH /templates/:id` → `UpdateDeliverableTemplate`
- [ ] `POST /templates/:id/activate` → `ActivateDeliverableTemplate`
- [ ] `POST /templates/:id/archive` → `ArchiveDeliverableTemplate`
- [ ] `POST /templates/:id/versions` → `CreateTemplateVersion`
- [ ] `POST /templates/:id/instantiate` → `InstantiateDeliverableTemplate`
- [ ] Zod request schemas aligned with DTO interfaces
- [ ] OpenAPI annotations (ADR-0039 contract versioning)

---

## 11. Event Publishing

**Context**: Domain events are defined but no event bus publishing is wired up.
**Deferred**: Publish events via the internal event bus (ADR-0016, ADR-0048).

- [ ] Wire `DeliverableTemplateInstantiatedEvent` → notify downstream (e.g., billing, metrics)
- [ ] Wire `DeliverableTemplateActivatedEvent` → audit log
- [ ] Wire `DeliverableTemplateArchivedEvent` → audit log
- [ ] Idempotency guard on event handler side

---

_Last updated: 2026-03-05_
