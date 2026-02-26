---
name: adr-check
description: "Audita um módulo do projeto comparando com todos os ADRs (Architecture Decision Records), identifica violações por severidade, aplica as correções diretamente no código e gera um relatório de conformidade com os gaps restantes. Use este skill SEMPRE que o usuário pedir para verificar conformidade com ADRs, checar se o módulo segue os ADRs, auditar o módulo, corrigir violações de ADR, encontrar gaps de implementação, ou revisar se o código está correto segundo as regras de arquitetura. Também usar quando o usuário mencionar checar os ADRs, verificar o módulo, auditar, encontrar bugs de arquitetura, ou qualquer variação disso."
---

# ADR Check Skill

Audita um módulo completo contra todos os ADRs, aplica correções no código
e entrega um relatório de conformidade com todos os gaps identificados.

## Visão Geral do Fluxo

```
1. Carregar ADRs  →  2. Analisar Módulo  →  3. Verificar Conformidade
                                                       ↓
                          5. Gerar Relatório  ←  4. Aplicar Correções
```

---

## FASE 1 — Carregar os ADRs e Regras de Arquitetura

Leia **todos** os arquivos em `docs/decisions/` (ou `docs/adr/` se for o caminho do projeto).
Também leia `.claude/rules.json`, `CLAUDE.md`.

Construa internamente um mapa de regras extraindo:

- Padrões arquiteturais obrigatórios por camada
- Convenções de nomenclatura de arquivos e classes
- Estados válidos e transições de cada agregado
- Onde e como eventos de domínio são despachados
- Como erros de domínio devem ser tratados (DomainResult, ErrorCodes)
- Limites de bounded context e regras de isolamento
- Contratos de integração entre contextos (ACL, eventos)
- Invariantes críticas que nunca podem ser violadas

**ADRs com atenção especial** (sempre relevantes para qualquer módulo):

| ADR | O que define |
|-----|-------------|
| `ADR-0003` | One aggregate per transaction |
| `ADR-0004` | Financial amounts em integer cents |
| `ADR-0009` | Agregados são máquinas de estado puras — SEM eventos, SEM side effects |
| `ADR-0022` | BANNED é estado terminal irreversível |
| `ADR-0025` | Isolamento de tenant — todas as queries incluem `professionalProfileId` |
| `ADR-0037` | Sem PII em logs, auditoria, cache ou erros |
| `ADR-0046` | AccessGrant lifecycle — 5 verificações obrigatórias |
| `ADR-0047` | UseCase é o ÚNICO dispatcher de eventos, pós-commit |

> Para o checklist completo de verificação ponto a ponto, veja `references/adr-compliance-rules.md`

---

## FASE 2 — Analisar o Módulo Completamente

Leia recursivamente **todos** os arquivos do módulo informado pelo usuário.

**Domain layer:**
- Aggregates, Entities, Value Objects
- Domain Events
- Domain Errors e error codes
- Repository interfaces

**Application layer:**
- Use Cases (Commands e Queries)
- DTOs de entrada e saída
- Port interfaces (event publishers, etc.)
- Event Handlers / Subscribers (se houver)

**Infrastructure layer:**
- Repository implementations
- Mappers / Serializers
- External adapters

**Testes:**
- Unit tests do domain
- Unit tests da application
- Integration tests (se houver)

Para cada arquivo lido, mantenha internamente uma lista do que ele faz,
quais invariantes aplica e quais dependências tem.

---

## FASE 3 — Verificar Conformidade Ponto a Ponto

Execute **todos** os itens do checklist em `references/adr-compliance-rules.md`
contra cada arquivo analisado.

Classifique cada violação encontrada:

- 🔴 **Crítica** — quebra contrato do ADR diretamente. Exemplos: aggregate publicando evento, `throw` no domain layer, import cross-context direto, BANNED com transição de saída, queries sem `professionalProfileId`.
- 🟡 **Moderada** — desvia de convenção ou boas práticas definidas nos ADRs. Exemplos: nomenclatura errada de error code, método retornando `void` quando deveria retornar `DomainResult<T>`, guard `/* v8 ignore */` desnecessário.
- 🔵 **Informativa** — gap que não quebra ADR mas representa melhoria ou teste ausente. Exemplos: use case implementado no aggregate mas sem use case na application layer, evento definido mas não despachado, cobertura de teste incompleta.

Para cada violação, registre:
- **Arquivo** e número de linha
- **ADR violado**
- **Descrição** do problema
- **Correção proposta**

---

## FASE 4 — Aplicar Correções no Código

### Correções Automáticas (aplicar diretamente)

Para violações **🔴 Críticas** e **🟡 Moderadas**, aplique as correções nos arquivos:

1. Use a ferramenta `Edit` para correções pontuais em arquivos existentes
2. Use a ferramenta `Write` para criar novos arquivos necessários (ex: error class faltante, port interface ausente)
3. Ao corrigir, siga **exatamente** os padrões do projeto — não invente novos padrões
4. Após cada correção, verifique se não introduziu novas violações

### Correções que Exigem Confirmação

Antes de aplicar correções que:
- Alteram a assinatura pública de uma classe (adição de parâmetro no constructor)
- Criam novos arquivos de use case completos
- Modificam testes existentes de forma significativa

...descreva a correção planejada e confirme que está alinhada com o restante do sistema.

### Gaps Informativos (🔵)

Para gaps informativos, **não aplique correções automáticas**.
Registre-os no relatório final com descrição clara e sugestão de implementação.

---

## FASE 5 — Gerar Relatório de Conformidade

Ao final, produza um relatório estruturado com este formato:

```markdown
## Relatório de Conformidade ADR — [Nome do Módulo]

**Data:** [data]
**ADR baseline:** [ADR mais recente analisado]
**Status geral:** ✅ Conforme | ⚠️ Parcialmente conforme | ❌ Violações críticas encontradas

---

### Correções Aplicadas

| # | Arquivo | Linha | Problema | ADR | Severidade | Ação tomada |
|---|---------|-------|----------|-----|------------|-------------|
| 1 | `path/to/file.ts` | 42 | [descrição] | ADR-000X | 🔴 Crítica | [o que foi corrigido] |

---

### Gaps Informativos (sem correção automática)

| # | Tipo | Descrição | Sugestão |
|---|------|-----------|----------|
| 1 | 🔵 Teste ausente | [descrição] | [como resolver] |
| 2 | 🔵 Use case faltante | [descrição] | [como resolver] |

---

### Tabela de Conformidade Final

| ADR | Área verificada | Status |
|-----|----------------|--------|
| ADR-0009 | Pureza de agregados | ✅ |
| ADR-0025 | Isolamento de tenant | ✅ |
| ADR-0047 | Dispatch de eventos | ✅ |
| ... | ... | ... |
```

Se não houver nenhuma violação, diga claramente:
> "Nenhuma violação encontrada. O módulo está em conformidade com todos os ADRs verificados."

---

## Arquivos de Referência

- `references/adr-compliance-rules.md` — Checklist completo de todos os pontos de verificação
