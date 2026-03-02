---
name: pr-review
description: "Analisa o diff completo do pull request em aberto contra todos os ADRs (ADR-0000 a ADR-0051) e convenções do projeto FitTrack, gerando um relatório de revisão estruturado com violações classificadas por severidade (🔴 Blocker / 🟡 Warning / 🔵 Suggestion) e um veredicto de aprovação. Use quando quiser revisar a conformidade arquitetural de um PR antes do merge. NÃO aplica correções no código — apenas analisa e reporta."
---

# PR Review — ADR & Code Quality

Analisa o diff do pull request ativo contra todos os ADRs e convenções do projeto,
produzindo um relatório estruturado **sem modificar o código**.

## Visão Geral do Fluxo

```
1. Obter Diff  →  2. Carregar ADRs  →  3. Analisar Diff  →  4. Gerar Relatório
```

---

## FASE 1 — Obter o Diff do Pull Request

Determine a branch base e obtenha o diff completo:

```bash
# Diff completo (patch format) em relação à main
git diff origin/main...HEAD

# Lista de arquivos modificados
git diff --name-only origin/main...HEAD
```

Para **cada arquivo TypeScript modificado** listado, leia o arquivo completo para
ter contexto além das linhas alteradas. Priorize arquivos em `packages/*/src/`.

> Se o diff for muito extenso, analise arquivo a arquivo em sequência.

---

## FASE 2 — Carregar os ADRs e Regras de Arquitetura

Leia **todos** os arquivos em `docs/decisions/` para construir o mapa de regras.
Também leia `.claude/rules.json` e `CLAUDE.md`.

**ADRs canônicos — verificação obrigatória em qualquer PR:**

| ADR | Invariante |
|-----|-----------|
| ADR-0003 | One aggregate per transaction |
| ADR-0004 | Financial amounts em integer cents, nunca float |
| ADR-0005 | Executions são imutáveis — nunca UPDATE/DELETE |
| ADR-0009 | Aggregate é máquina de estado pura — sem eventos, sem side effects |
| ADR-0010 | `logicalDay` imutável; timestamps UTC com sufixo `AtUtc` |
| ADR-0022 | BANNED é estado terminal e irreversível — nenhuma transição de saída |
| ADR-0025 | Tenant isolation — todas as queries incluem `professionalProfileId` |
| ADR-0037 | Sem PII, dados de saúde ou valores financeiros em logs/erros/cache |
| ADR-0046 | AccessGrant — 5 verificações obrigatórias antes de qualquer operação |
| ADR-0047 | UseCase é o ÚNICO dispatcher de eventos, **pós-save** |

> Para o checklist completo de verificação ponto a ponto, veja `references/pr-review-checklist.md`

---

## FASE 3 — Analisar o Diff

Para **cada arquivo modificado**, execute todos os itens do checklist em
`references/pr-review-checklist.md` contra as linhas alteradas e o contexto do arquivo.

Classifique cada problema encontrado:

- 🔴 **Blocker** — Quebra invariante crítica de ADR. **O PR não deveria ser mergeado sem correção.**
  Exemplos: aggregate coletando ou publicando evento, `throw` não guardado no domain layer,
  query sem `professionalProfileId`, BANNED com transição de saída, valor financeiro em float,
  `logicalDay` sendo recalculado pós-criação, cross-context import direto.

- 🟡 **Warning** — Desvia de convenção definida nos ADRs. Deve ser corrigido antes do merge.
  Exemplos: nomenclatura de arquivo fora do padrão, error code sem namespace `MODULO.`,
  port interface ausente, dispatch de evento antes do save, método falível retornando `void`.

- 🔵 **Suggestion** — Melhoria recomendada, não bloqueia o merge.
  Exemplos: teste de transição de estado ausente, evento definido mas sem dispatch,
  cobertura de use case incompleta, guard `/* v8 ignore */` desnecessário.

Para cada item, registre:
- Arquivo e número de linha (aproximado se necessário)
- ADR violado
- Descrição objetiva do problema
- Sugestão de correção

---

## FASE 4 — Gerar Relatório de Revisão

Produza o relatório no formato abaixo em Português.
Adapte as seções: se não houver blockers, substitua a tabela por `> Nenhum blocker encontrado. ✅`.

```markdown
## 🔍 PR Review — ADR & Code Quality

**Branch:** `[branch-name]` → `main`
**Revisado em:** [data no formato DD/MM/YYYY]
**Arquivos analisados:** [N] arquivos TypeScript
**Veredicto:** ✅ Aprovado | ⚠️ Aprovado com ressalvas | ❌ Bloqueado

---

### Sumário

[2-3 linhas descrevendo o que o PR implementa e o estado geral de conformidade com os ADRs.]

---

### 🔴 Blockers — Corrigir antes do merge

| # | Arquivo | Linha | Problema | ADR |
|---|---------|-------|----------|-----|
| 1 | `packages/x/src/domain/y.ts` | 42 | [descrição clara e objetiva] | ADR-000X |

---

### 🟡 Warnings — Recomendado corrigir

| # | Arquivo | Linha | Problema | ADR |
|---|---------|-------|----------|-----|

---

### 🔵 Suggestions — Melhorias opcionais

| # | Arquivo | Sugestão |
|---|---------|----------|

---

### Conformidade ADR — Resumo

| ADR | Área | Status |
|-----|------|--------|
| ADR-0003 | One aggregate per transaction | ✅ |
| ADR-0004 | Financial amounts (integer cents) | ✅ |
| ADR-0005 | Execution immutability | ✅ |
| ADR-0009 | Pureza de agregados | ✅ |
| ADR-0010 | Temporal policy (logicalDay / UTC) | ✅ |
| ADR-0022 | Risk governance (BANNED terminal) | ✅ |
| ADR-0025 | Tenant isolation | ✅ |
| ADR-0037 | Sem PII em logs/erros/cache | ✅ |
| ADR-0046 | AccessGrant lifecycle | ✅ |
| ADR-0047 | Event dispatch (UseCase only, pós-save) | ✅ |

---

*Revisão gerada automaticamente pelo skill `pr-review` do Claude Code.*
*ADR baseline: ADR-0051 | FitTrack Modular Monolith DDD*
```

Se não houver nenhum problema, declare claramente:
> "Nenhuma violação encontrada. O PR está em conformidade com todos os ADRs verificados. ✅"

---

## Arquivos de Referência

- `references/pr-review-checklist.md` — Checklist completo de todos os pontos de verificação por área
