# MOVIDO — Regras de Conformidade com ADRs

> Este arquivo foi movido para o skill `adr-check`.
> Consulte: `.claude/skills/adr-check/references/adr-compliance-rules.md`
>
> O skill `adr-module-docs` não realiza verificação de conformidade.
> Use o skill `adr-check` para auditar e corrigir código.
Use durante a Fase 3 do skill.

---

## 1. Pureza das Camadas (Layer Purity)

### Domain Layer

- [ ] Nenhum import de infrastructure no domain
- [ ] Nenhum import de framework (NestJS, Express, etc.) no domain
- [ ] Nenhum decorator de framework em entidades ou agregados
- [ ] Nenhum acesso direto a banco de dados no domain
- [ ] Nenhuma chamada HTTP no domain

### Application Layer

- [ ] Use Cases importam apenas interfaces (portas), nunca implementações
- [ ] Use Cases não contêm lógica de negócio (delegam para o domain)
- [ ] Use Cases são o único ponto de dispatch de eventos de domínio
- [ ] Eventos são despachados **pós-commit** via Outbox pattern

### Infrastructure Layer

- [ ] Nenhuma lógica de negócio nas implementações de repositório
- [ ] Mappers não tomam decisões de domínio
- [ ] Adapters externos isolados em classes específicas

---

## 2. Pureza de Agregados (ADR-0009)

- [ ] Agregados são máquinas de estado puras
- [ ] Agregados NÃO coletam eventos de domínio internamente
- [ ] Agregados NÃO publicam eventos diretamente
- [ ] Métodos do agregado retornam `DomainResult<T>` (nunca `void` em operações que podem falhar)
- [ ] Nenhum `throw` dentro de agregados
- [ ] Nenhum side effect externo dentro de agregados
- [ ] Construtor é privado ou usa factory method

---

## 3. Tratamento de Erros de Domínio (ADR-0051)

- [ ] Todos os métodos de domínio que podem falhar retornam `DomainResult<T>`
- [ ] Nenhum `throw new Error(...)` no domain layer
- [ ] Códigos de erro seguem o padrão: `CONTEXT_ENTITY_REASON` (ex: `BILLING_SUBSCRIPTION_ALREADY_CANCELLED`)
- [ ] Todos os códigos de erro estão enumerados em um arquivo de constantes do módulo
- [ ] Application layer faz unwrap de `DomainResult<T>` e converte para exceções HTTP/RPC se necessário

---

## 4. Máquinas de Estado e Ciclos de Vida

- [ ] Todos os estados possíveis estão documentados no ADR correspondente
- [ ] Apenas transições válidas estão implementadas
- [ ] Estado `BANNED` (e equivalentes terminais) não tem transições de saída (ADR-0022)
- [ ] Nenhuma transição bypassa a máquina de estado (ex: update direto no banco)
- [ ] Transições inválidas retornam `DomainResult.fail()` com código de erro apropriado

---

## 5. Eventos de Domínio (ADR-0047)

- [ ] Eventos são despachados apenas em Use Cases (application layer)
- [ ] Dispatch ocorre pós-commit (via Outbox ou equivalente)
- [ ] Nomes de eventos seguem o padrão: `[Contexto][Entidade][Ação]` no passado (ex: `BillingSubscriptionCancelled`)
- [ ] Payload dos eventos contém apenas dados necessários (sem entidades completas)
- [ ] Consumidores de eventos são idempotentes

---

## 6. Limites de Bounded Context

- [ ] Módulo não importa diretamente entidades de outro bounded context
- [ ] Comunicação cross-context ocorre via eventos de domínio
- [ ] Se houver ACL (Anti-Corruption Layer), está claramente separada
- [ ] Shared Kernel está identificado e documentado

---

## 7. Access & Authorization (ADR-0046)

- [ ] `AccessGrant` é usado para controle de acesso quando definido no ADR
- [ ] Campo `source` do `AccessGrant` contém apenas valores definidos no ADR
- [ ] Verificações de autorização ocorrem na application layer, não no domain

---

## 8. One-Time Products (ADR-0050) — apenas para módulo Products/Billing

- [ ] Fluxo de compra usa `source=PRODUCT_PURCHASE` no `AccessGrant`
- [ ] `productVersionId` está presente no grant
- [ ] Entrega de produto é via `Deliverables` context
- [ ] Idempotência de compra está garantida

---

## 9. Nomenclatura e Convenções

- [ ] Arquivos de agregado: `[NomeAgregado].ts` (PascalCase)
- [ ] Arquivos de use case: `[nome-caso-uso].use-case.ts` (kebab-case)
- [ ] Arquivos de repositório (interface): `I[Nome]Repository.ts`
- [ ] Arquivos de repositório (implementação): `[Nome]Repository.ts`
- [ ] Arquivos de evento: `[NomeEvento].event.ts`
- [ ] Arquivos de erro: `[modulo].errors.ts`

---

## 10. Cobertura de Testes

- [ ] Testes unitários cobrem todas as transições de estado do agregado
- [ ] Testes unitários cobrem todos os caminhos de erro (`DomainResult.fail`)
- [ ] Testes testam comportamento, não implementação interna
- [ ] Testes de integração cobrem os use cases principais
- [ ] Sem mocks de domínio (apenas mocks de infraestrutura)

---

## Referência Rápida: Severidade

| Tipo de Violação                 | Severidade     | Ação                   |
| -------------------------------- | -------------- | ---------------------- |
| Aggregate publica evento         | 🔴 Crítica     | Corrigir imediatamente |
| `throw` no domain layer          | 🔴 Crítica     | Corrigir imediatamente |
| Import cross-context direto      | 🔴 Crítica     | Corrigir imediatamente |
| BANNED com transição de saída    | 🔴 Crítica     | Corrigir imediatamente |
| Lógica de negócio no repositório | 🟡 Moderada    | Corrigir se possível   |
| Nomenclatura fora do padrão      | 🟡 Moderada    | Corrigir se possível   |
| Ausência de teste de transição   | 🔵 Informativa | Registrar e criar      |
| Ausência de teste de erro        | 🔵 Informativa | Registrar e criar      |
