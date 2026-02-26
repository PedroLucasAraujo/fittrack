# Referência: Regras de Conformidade com ADRs

Este arquivo lista todos os pontos de verificação para auditoria de conformidade.
Use durante a Fase 3 do skill `adr-check`.

---

## 1. Pureza das Camadas (Layer Purity)

### Domain Layer

- [ ] Nenhum import de infrastructure no domain
- [ ] Nenhum import de framework (NestJS, Express, Prisma, Redis) no domain
- [ ] Nenhum decorator de framework em entidades ou agregados
- [ ] Nenhum acesso direto a banco de dados no domain
- [ ] Nenhuma chamada HTTP no domain
- [ ] Repository interfaces definidas no domain, implementações na infrastructure

### Application Layer

- [ ] Use Cases importam apenas interfaces (portas), nunca implementações concretas
- [ ] Use Cases não contêm lógica de negócio (delegam para o domain)
- [ ] Use Cases são o único ponto de dispatch de eventos de domínio (ADR-0047)
- [ ] Eventos despachados **pós-save**, nunca antes
- [ ] Port interfaces (`ISchedulingEventPublisher`, etc.) definidas em `application/ports/`

### Infrastructure Layer

- [ ] Nenhuma lógica de negócio nas implementações de repositório
- [ ] Mappers não tomam decisões de domínio
- [ ] Adapters externos isolados em classes específicas

---

## 2. Pureza de Agregados (ADR-0009)

- [ ] Agregados são máquinas de estado puras
- [ ] Agregados NÃO coletam eventos de domínio internamente
- [ ] Agregados NÃO publicam eventos diretamente
- [ ] Métodos que podem falhar retornam `DomainResult<T>` (never `void` em operações falíveis)
- [ ] Nenhum `throw` dentro de agregados ou entidades de domínio
- [ ] Nenhum side effect externo dentro de agregados
- [ ] Construtor é privado com factory method estático (`create`, `reconstitute`)

---

## 3. Tratamento de Erros de Domínio

- [ ] Todos os métodos de domínio falíveis retornam `DomainResult<T>` (Either monad)
- [ ] Nenhum `throw new Error(...)` no domain layer (exceto guards `/* v8 ignore next */` de invariante impossível)
- [ ] Códigos de erro seguem o padrão: `MODULO.ENTIDADE_MOTIVO` (ex: `SCHEDULING.BOOKING_NOT_FOUND`)
- [ ] Todos os códigos de erro estão enumerados em um arquivo de constantes (`scheduling-error-codes.ts`)
- [ ] Cada erro de domínio tem sua própria classe extendendo `DomainError`
- [ ] Nomes de classes de erro são semanticamente corretos para o agregado ao qual pertencem

---

## 4. Máquinas de Estado e Ciclos de Vida

- [ ] Todos os estados possíveis estão implementados como enum
- [ ] Apenas transições válidas estão implementadas (conforme ADR do módulo)
- [ ] Estado `BANNED` (e equivalentes terminais) não tem transições de saída (ADR-0022)
- [ ] Nenhuma transição bypassa a máquina de estado
- [ ] Transições inválidas retornam `left(new ErrorClass(...))` com código de erro apropriado
- [ ] Estados terminais são claramente identificáveis (`isTerminal()` ou equivalente)

---

## 5. Eventos de Domínio (ADR-0047)

- [ ] Eventos são despachados apenas em Use Cases (application layer)
- [ ] Dispatch ocorre pós-save (nunca antes, nunca dentro do aggregate)
- [ ] Nomes de eventos seguem padrão: `[Entidade][Ação]` no passado (ex: `BookingConfirmed`)
- [ ] Payload dos eventos contém apenas dados necessários (sem entidades completas)
- [ ] Todos os eventos definidos em `domain/events/` estão sendo despachados em algum use case
- [ ] Port `ISchedulingEventPublisher` (ou equivalente) existe em `application/ports/` para cada publisher

---

## 6. Isolamento de Tenant (ADR-0025)

- [ ] Todas as queries de repositório incluem `professionalProfileId`
- [ ] Use Cases que buscam por ID usam `findByIdAndProfessionalProfileId`, não `findById`
- [ ] Acesso cross-tenant retorna `404` (not found), nunca `403` (forbidden)
- [ ] Exceção: atores de sistema (ex: `CancelBookingBySystem`) podem usar `findById` sem tenant

---

## 7. Nomenclatura e Convenções do Projeto

- [ ] Arquivos de agregado: `[nome-agregado].ts` (kebab-case)
- [ ] Arquivos de use case: `[nome-caso-uso].ts` (kebab-case)
- [ ] Arquivos de repositório (interface): `[nome]-repository.ts` em `domain/repositories/`
- [ ] Arquivos de evento: `[nome-evento].ts` em `domain/events/`
- [ ] Arquivos de erro: `[nome]-error.ts` em `domain/errors/`
- [ ] Error codes: namespace `MODULO.` como prefixo
- [ ] Timestamps UTC: sufixo `AtUtc` (ex: `createdAtUtc`, `cancelledAtUtc`)
- [ ] Datas de calendário: `logicalDay` (string `YYYY-MM-DD`)
- [ ] Timezone: `timezoneUsed` (IANA string)

---

## 8. Cobertura de Testes

- [ ] Testes unitários cobrem todas as transições de estado do agregado
- [ ] Testes unitários cobrem todos os caminhos de erro (`DomainResult` left)
- [ ] Testes de use case verificam dispatch de eventos (com stub)
- [ ] Testes de use case verificam isolamento de tenant (cross-tenant retorna 404)
- [ ] Sem mocks de domínio — apenas in-memory repositories e stubs de infrastructure
- [ ] `application/ports/**` excluído do threshold de cobertura (interfaces puras, sem código executável)

---

## 9. Limites de Bounded Context

- [ ] Módulo não importa diretamente entidades de outro bounded context
- [ ] Comunicação cross-context ocorre via eventos de domínio ou ACL (Anti-Corruption Layer)
- [ ] Se houver ACL, está claramente separada como DTO de validação (ex: `AccessGrantValidationDTO`)
- [ ] Shared Kernel (ex: `@fittrack/core`) é o único import transversal permitido

---

## 10. Sem PII em Logs e Erros (ADR-0037)

- [ ] Nenhum dado pessoal (nome, email, CPF) em mensagens de erro de domínio
- [ ] Nenhum dado de saúde em logs ou payloads de eventos
- [ ] Valores financeiros (amounts) não expostos em logs

---

## Referência Rápida: Severidade

| Tipo de Violação | Severidade | Ação |
|---|---|---|
| Aggregate publica/coleta evento | 🔴 Crítica | Corrigir imediatamente |
| `throw` não guardado no domain layer | 🔴 Crítica | Corrigir imediatamente |
| Import cross-context direto | 🔴 Crítica | Corrigir imediatamente |
| BANNED com transição de saída | 🔴 Crítica | Corrigir imediatamente |
| Query sem `professionalProfileId` (sem justificativa) | 🔴 Crítica | Corrigir imediatamente |
| Nome de error class semanticamente errado | 🟡 Moderada | Corrigir — criar nova classe |
| Evento definido mas não despachado | 🟡 Moderada | Criar use case ou dispatch |
| Port interface ausente | 🟡 Moderada | Criar em `application/ports/` |
| Nomenclatura de arquivo fora do padrão | 🟡 Moderada | Renomear |
| Use case no aggregate sem use case na application | 🔵 Informativa | Criar use case |
| Ausência de teste de transição de estado | 🔵 Informativa | Criar teste |
| Ausência de teste de evento publicado | 🔵 Informativa | Criar teste com stub |
| `application/ports/**` incluído no coverage threshold | 🔵 Informativa | Excluir no vitest.config.ts |
