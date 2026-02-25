---
name: adr-module-docs
description: "Analisa módulos do projeto comparando com os ADRs (Architecture Decision Records) e gera documentação humanizada em português com todas as funcionalidades, regras de negócio, casos de uso e modelo de domínio. Use este skill SEMPRE que o usuário pedir para documentar um módulo, gerar documentação de funcionalidades, analisar conformidade com ADRs, atualizar documentação existente, verificar se o código segue os ADRs, ou criar páginas no Notion com a documentação de um módulo. Também usar quando o usuário mencionar documentar o módulo, checar os ADRs, gerar doc do módulo, funcionalidades do módulo, ou qualquer variação disso."
---

# ADR Module Docs Skill

Gera documentação completa e humanizada em português para cada módulo do projeto,
comparando o código com os ADRs e publicando no Notion ou em Markdown.

## Visão Geral do Fluxo

```
1. Carregar ADRs  →  2. Analisar Módulo  →  3. Verificar Conformidade
       ↓
4. Corrigir Violações  →  5. Gerar Documentação  →  6. Publicar (Notion ou .md)
```

---

## FASE 1 — Carregar os ADRs

Antes de qualquer análise, leia **todos** os arquivos em `docs/adr/`.
Também leia `.claude/rules.json`, `CLAUDE.md` e `.claude/context.md`.

Construa internamente um mapa de regras extraindo:

- Padrões arquiteturais obrigatórios
- Convenções de nomenclatura
- Estados válidos e transições de cada agregado
- Onde eventos de domínio são despachados
- Como erros de domínio devem ser tratados
- Limites de bounded context
- Contratos de integração entre contextos

**ADRs com atenção especial** (sempre relevantes):

- `ADR-0000` — FROZEN, fundacional, nunca modificar
- `ADR-0009` — Agregados são máquinas de estado puras, SEM eventos, SEM side effects
- `ADR-0022` — BANNED é estado terminal, sem transição de saída jamais
- `ADR-0047` — UseCase é o ÚNICO dispatcher de eventos (pós-commit, via Outbox)
- `ADR-0051` — Domínio usa `DomainResult<T>`, sem `throw` no domain layer
- `ADR-0050` — Arquitetura de One-Time Products

> Para documentação detalhada do formato de conformidade, veja `references/adr-compliance-rules.md`

---

## FASE 2 — Analisar o Módulo

Leia recursivamente **todos** os arquivos do módulo alvo:

**Domain layer:**

- Entities, Aggregates, Value Objects
- Domain Services
- Domain Events
- Domain Errors / Result types

**Application layer:**

- Use Cases (Commands e Queries)
- Event Handlers / Subscribers
- DTOs e validators

**Infrastructure layer:**

- Repositories (implementações)
- Mappers / Serializers
- External adapters

**Interface layer (se houver):**

- Controllers / Resolvers
- Request/Response DTOs
- Guards e decorators de autorização

**Testes:**

- Unit tests
- Integration tests

---

## FASE 3 — Verificar Conformidade com ADRs

Para cada arquivo analisado, cheque todos os pontos em `references/adr-compliance-rules.md`.

Classifique cada violação encontrada por severidade:

- 🔴 **Crítica** — quebra contrato do ADR, precisa corrigir antes de documentar
- 🟡 **Moderada** — desvia de convenção, corrigir se possível
- 🔵 **Informativa** — gap de teste, sugestão de melhoria

Se houver violações **críticas**, corrija-as antes de gerar a documentação.
Para violações moderadas, aplique as correções e documente o que foi ajustado.
Para informativas, registre na seção "Gaps & Melhorias" da documentação.

---

## FASE 4 — Gerar a Documentação

Gere a documentação seguindo o template em `references/doc-template-pt.md`.

**Diretrizes de escrita:**

- Escreva para um leitor que **nunca viu o código** mas entende o negócio
- Use linguagem clara, direta e em português brasileiro
- Evite jargões técnicos sem explicação
- Cada regra de negócio deve ter uma frase que explique o **porquê** dela existir
- Use exemplos concretos quando a regra for complexa
- Fluxos complexos ganham diagrama em Mermaid

**O que NUNCA omitir:**

- Toda transição de estado do agregado
- Todo código de erro de domínio e quando ele ocorre
- Todo use case, mesmo os simples
- Toda regra de autorização
- Toda dependência de outro bounded context

---

## FASE 5 — Publicar

### Opção A: Notion (via claude.ai)

Se o usuário pedir publicação no Notion, gere o markdown e retorne para o claude.ai
fazer o push via integração Notion. Salve também em `docs/modules/[MODULO].md`.

### Opção B: Markdown no repositório

Salve em `docs/modules/[NOME_DO_MODULO]-pt.md`.

### Opção C: Atualização (módulo já documentado)

Se já existir documentação, compare seção por seção e atualize apenas o que mudou.
Adicione uma linha no topo: `> Última atualização: [data] — [lista resumida do que mudou]`

---

## Execução Rápida (uso no Claude Code)

Para rodar o skill em um módulo específico, use este comando no terminal do Claude Code:

```bash
# Análise e documentação de um módulo
# Substitua [MODULO] pelo nome da pasta do módulo (ex: billing, users, executions)

MODULO=[MODULO] && \
echo "Iniciando análise ADR para o módulo: $MODULO" && \
echo "Lendo ADRs em docs/adr/ ..." && \
echo "Analisando src/modules/$MODULO/ ..." && \
echo "Gerando documentação em docs/modules/$MODULO-pt.md ..."
```

Após rodar, o Claude Code lê os ADRs, analisa o módulo e gera o `.md`.
Você então cola o conteúdo aqui no claude.ai para publicar no Notion.

---

## Arquivos de Referência

- `references/adr-compliance-rules.md` — Checklist completo de conformidade com ADRs
- `references/doc-template-pt.md` — Template da documentação em português
- `references/notion-page-structure.md` — Como estruturar páginas no Notion
