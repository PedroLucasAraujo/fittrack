---
name: adr-module-docs
description: "Gera documentação humanizada em português de um módulo do projeto, descrevendo funcionalidades, regras de negócio, casos de uso, modelo de domínio e eventos. Use este skill SEMPRE que o usuário pedir para documentar um módulo, gerar documentação de funcionalidades, criar ou atualizar documentação existente, ou criar páginas no Notion com a documentação de um módulo. Também usar quando o usuário mencionar documentar o módulo, gerar doc do módulo, funcionalidades do módulo, criar página no Notion, ou qualquer variação disso. NÃO use este skill para verificar conformidade com ADRs ou aplicar correções de código — para isso use o skill adr-check."
---

# ADR Module Docs Skill

Gera documentação completa e humanizada em português para cada módulo do projeto.
Parte do pressuposto de que o módulo já foi auditado (ou usa a análise do código
diretamente para descrever o que está implementado).

## Visão Geral do Fluxo

```
1. Carregar ADRs (contexto)  →  2. Analisar Módulo  →  3. Gerar Documentação  →  4. Publicar
```

---

## FASE 1 — Carregar os ADRs como Contexto de Negócio

Leia **todos** os arquivos em `docs/decisions/` (ou `docs/adr/`).
Também leia `CLAUDE.md`.

O objetivo aqui **não é verificar conformidade**, mas entender:
- O que cada agregado representa no negócio
- Quais invariantes de negócio existem (para explicar o *porquê* de cada regra)
- Como os bounded contexts se relacionam
- Quais fluxos envolvem múltiplos módulos

---

## FASE 2 — Analisar o Módulo

Leia recursivamente **todos** os arquivos do módulo alvo:

**Domain layer:**
- Aggregates, Entities, Value Objects → para documentar o modelo de domínio
- Domain Events → para documentar os eventos publicados
- Domain Errors e error codes → para documentar os erros possíveis
- Repository interfaces → para entender as operações de leitura/escrita

**Application layer:**
- Use Cases → para documentar cada funcionalidade disponível
- DTOs de entrada e saída → para documentar a interface de cada use case
- Port interfaces → para documentar dependências externas

**Testes:**
- Unit tests → para entender os cenários de comportamento cobertos
  (os testes revelam as regras de negócio implícitas)

> **Nota:** Se o usuário informar que rodou o `adr-check` antes, incorpore
> o relatório de conformidade gerado na seção "Conformidade com ADRs" e
> na seção "Gaps e Melhorias" da documentação.

---

## FASE 3 — Gerar a Documentação

Gere a documentação seguindo **exatamente** o template em `references/doc-template-pt.md`.

### Diretrizes de Escrita

- Escreva para um leitor que **nunca viu o código** mas entende o negócio
- Use linguagem clara, direta e em português brasileiro
- Evite jargões técnicos sem explicação (se usar um termo técnico, explique em parênteses)
- Cada regra de negócio deve ter uma frase que explique o **porquê** dela existir
- Use exemplos concretos quando a regra for complexa
- Fluxos com 4+ etapas ganham diagrama em Mermaid

### O que NUNCA omitir

- Toda transição de estado de todo agregado
- Todo código de erro de domínio e quando ele ocorre
- Todo use case, mesmo os simples ("buscar por ID" conta)
- Toda dependência de outro bounded context
- Todos os eventos publicados e quando são emitidos

### Seção "Gaps e Melhorias"

Se o usuário **não rodou** o `adr-check` antes:
- Identifique visualmente gaps óbvios (use case no aggregate sem use case na application, evento sem dispatch, etc.)
- Liste na seção "Gaps e Melhorias" com severidade 🔵 Informativa
- **Não tente corrigir código** — esse não é o propósito deste skill

Se o usuário **rodou** o `adr-check` antes:
- Incorpore os gaps do relatório de conformidade diretamente nesta seção

---

## FASE 4 — Publicar

### Opção A: Markdown no repositório (padrão)

Salve em `docs/modules/[NOME_DO_MODULO]-pt.md`.

### Opção B: Notion (via claude.ai)

Se o usuário pedir publicação no Notion:
1. Salve primeiro no repositório em `docs/modules/[NOME_DO_MODULO]-pt.md`
2. Exiba o conteúdo e instrua o usuário a levá-lo ao claude.ai para publicar no Notion
3. Siga a estrutura de página em `references/notion-page-structure.md`

### Opção C: Atualização de documentação existente

Se já existir `docs/modules/[NOME_DO_MODULO]-pt.md`:
1. Leia o arquivo existente
2. Compare seção por seção com o estado atual do código
3. Atualize apenas o que mudou
4. Adicione entrada no "Histórico de Atualizações" com a data e o que foi alterado

---

## Arquivos de Referência

- `references/doc-template-pt.md` — Template completo da documentação em português
- `references/notion-page-structure.md` — Como estruturar e publicar páginas no Notion
