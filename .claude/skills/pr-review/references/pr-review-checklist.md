# Referência: Checklist de Revisão de PR

Este arquivo lista todos os pontos de verificação para revisão de pull requests.
Use durante a Fase 3 do skill `pr-review`.

> **Diferença do `adr-check`:** Este checklist é aplicado sobre o **diff do PR**,
> não sobre um módulo completo. Foque nas linhas adicionadas/modificadas (`+`),
> mas leia o arquivo completo para entender o contexto.

---

## 1. Pureza das Camadas (Layer Purity)

### Domain Layer — verificar nos arquivos modificados em `domain/`

- [ ] Nenhum import de infrastructure (Prisma, Redis, HTTP clients) introduzido
- [ ] Nenhum import de framework (NestJS, Express, decorators) introduzido
- [ ] Nenhum acesso direto a banco de dados adicionado
- [ ] Repository interfaces definidas no domain; implementações somente na infrastructure
- [ ] Nenhuma dependência nova de `packages/*/src/infrastructure/` no domain layer

### Application Layer — verificar nos arquivos modificados em `application/`

- [ ] Use Cases importam apenas interfaces (portas), nunca implementações concretas
- [ ] Lógica de negócio delegada ao domain; Use Case orquestra, não decide
- [ ] Use Cases são o único ponto de dispatch de eventos de domínio (ADR-0047)
- [ ] Novos eventos despachados **pós-save**, nunca antes
- [ ] Novas port interfaces criadas em `application/ports/` se necessário

### Infrastructure Layer — verificar nos arquivos modificados em `infrastructure/`

- [ ] Nenhuma lógica de negócio introduzida nas implementações de repositório
- [ ] Mappers não tomam decisões de domínio (apenas conversão de dados)
- [ ] Adapters externos isolados em classes específicas

---

## 2. Pureza de Agregados (ADR-0009)

- [ ] Agregados modificados continuam sendo máquinas de estado puras
- [ ] Nenhum código novo coleta eventos de domínio internamente no aggregate
- [ ] Nenhum código novo publica/dispara eventos diretamente no aggregate
- [ ] Métodos falíveis novos ou modificados retornam `DomainResult<T>`, nunca `void`
- [ ] Nenhum `throw` adicionado dentro de agregados ou entidades (exceto guards impossíveis)
- [ ] Nenhum side effect externo (I/O, network, timer) introduzido em agregados
- [ ] Factory methods (`create`, `reconstitute`) preservados; construtor permanece privado

---

## 3. Tratamento de Erros de Domínio

- [ ] Novos erros de domínio retornam `DomainResult<T>` (Either monad)
- [ ] Nenhum `throw new Error(...)` adicionado no domain layer sem guard `/* v8 ignore next */`
- [ ] Novos códigos de erro seguem o padrão: `MODULO.ENTIDADE_MOTIVO`
  (ex: `SCHEDULING.BOOKING_NOT_FOUND`, `IDENTITY.USER_ALREADY_BANNED`)
- [ ] Novos error codes declarados no arquivo de constantes do módulo
- [ ] Novas classes de erro estendem `DomainError`
- [ ] Nomes de classes de erro são semanticamente corretos para o agregado

---

## 4. Máquinas de Estado e Ciclos de Vida

- [ ] Novos estados adicionados como enum (nunca string literal avulsa)
- [ ] Apenas transições válidas implementadas (conforme ADR do módulo)
- [ ] Estado `BANNED` (e equivalentes terminais) sem nenhuma transição de saída (ADR-0022)
- [ ] Nenhuma nova transição bypassa a máquina de estado
- [ ] Transições inválidas retornam `left(new ErrorClass(...))` com código de erro

---

## 5. Eventos de Domínio (ADR-0047)

- [ ] Novos eventos despachados apenas em Use Cases (application layer)
- [ ] Dispatch ocorre pós-save (após confirmação de persistência)
- [ ] Nomes de novos eventos seguem padrão `[Entidade][AçãoPassado]`
  (ex: `BookingConfirmed`, `ExecutionCorrectionRecorded`)
- [ ] Payload dos novos eventos contém apenas dados necessários, sem entidades completas
- [ ] Novos eventos definidos em `domain/events/` têm dispatch correspondente em algum use case
- [ ] Se o PR introduce um novo publisher, a port `I[Modulo]EventPublisher` foi criada em `application/ports/`

---

## 6. Isolamento de Tenant (ADR-0025)

- [ ] Todas as queries de repositório adicionadas incluem `professionalProfileId`
- [ ] Novos Use Cases que buscam por ID usam `findByIdAndProfessionalProfileId`, não `findById`
- [ ] Acesso cross-tenant retorna `404` (not found), nunca `403` (forbidden)
- [ ] Exceção documentada: atores de sistema (ex: `CancelBySystem`) podem omitir tenant com justificativa

---

## 7. Imutabilidade de Executions (ADR-0005)

- [ ] Nenhuma operação de UPDATE ou DELETE em registros de `Execution`
- [ ] Correções em execuções usam evento compensatório `ExecutionCorrectionRecorded`
- [ ] Nenhum método `update()` ou `delete()` adicionado ao repositório de Execution

---

## 8. Política Temporal (ADR-0010)

- [ ] `logicalDay` não é recalculado após criação (imutável)
- [ ] Novos timestamps UTC usam sufixo `AtUtc` (ex: `confirmedAtUtc`)
- [ ] Datas de calendário usam `logicalDay` (string `YYYY-MM-DD`), nunca `Date` object
- [ ] Timezones representados como IANA string em `timezoneUsed`
- [ ] Nenhum `new Date()` sem conversão explícita para UTC ISO string

---

## 9. Valores Financeiros (ADR-0004)

- [ ] Todos os valores monetários representados como integer (cents), nunca float
- [ ] Nenhuma operação aritmética com `*` ou `/` que produza decimais em amounts
- [ ] Nenhum campo de amount tipado como `number` sem restrição de inteiro

---

## 10. Sem PII em Logs, Erros ou Cache (ADR-0037)

- [ ] Nenhum dado pessoal (nome, email, CPF, telefone) em mensagens de erro de domínio
- [ ] Nenhum dado de saúde em logs ou payloads de eventos
- [ ] Valores financeiros (amounts) não expostos em logs ou audit
- [ ] Nenhum PII em chaves de cache ou payloads cacheados

---

## 11. AccessGrant (ADR-0046)

- [ ] Operações que requerem AccessGrant realizam as 5 verificações:
  1. `status === ACTIVE`
  2. `clientId` corresponde
  3. `professionalProfileId` corresponde
  4. `validUntil` não expirado
  5. `sessionAllotment` não esgotado
- [ ] Nenhuma operação bypassa essas verificações

---

## 12. Nomenclatura e Convenções do Projeto

- [ ] Arquivos de agregado: `[nome-agregado].ts` (kebab-case)
- [ ] Arquivos de use case: `[nome-caso-uso].ts` (kebab-case)
- [ ] Arquivos de repositório interface: `[nome]-repository.ts` em `domain/repositories/`
- [ ] Arquivos de evento: `[nome-evento].ts` em `domain/events/`
- [ ] Arquivos de erro: `[nome]-error.ts` em `domain/errors/`
- [ ] Timestamps UTC: sufixo `AtUtc` (ex: `createdAtUtc`)
- [ ] Datas de calendário: `logicalDay` (string `YYYY-MM-DD`)
- [ ] Timezone: `timezoneUsed` (IANA string)

---

## 13. Limites de Bounded Context

- [ ] Módulo modificado não passou a importar entidades de outro bounded context diretamente
- [ ] Comunicação cross-context via eventos de domínio ou ACL (Anti-Corruption Layer)
- [ ] `@fittrack/core` continua sendo o único import transversal permitido

---

## 14. Cobertura de Testes

- [ ] Novas transições de estado têm testes unitários correspondentes
- [ ] Novos caminhos de erro (`DomainResult` left) têm testes
- [ ] Novos use cases verificam dispatch de eventos (com stub)
- [ ] Novos use cases verificam isolamento de tenant (cross-tenant retorna 404)
- [ ] Testes de domain usam in-memory repositories, sem mocks de infrastructure

---

## Referência Rápida: Tabela de Severidade

| Tipo de Violação | Severidade | Impacto no PR |
|---|---|---|
| Aggregate publica/coleta evento | 🔴 Blocker | Não mergeável |
| `throw` não guardado no domain layer | 🔴 Blocker | Não mergeável |
| Import cross-context direto | 🔴 Blocker | Não mergeável |
| BANNED com transição de saída | 🔴 Blocker | Não mergeável |
| Query sem `professionalProfileId` (sem justificativa) | 🔴 Blocker | Não mergeável |
| Valor financeiro em float | 🔴 Blocker | Não mergeável |
| `logicalDay` recalculado pós-criação | 🔴 Blocker | Não mergeável |
| UPDATE/DELETE em Execution | 🔴 Blocker | Não mergeável |
| AccessGrant sem as 5 verificações | 🔴 Blocker | Não mergeável |
| Dispatch de evento antes do save | 🟡 Warning | Corrigir antes do merge |
| Nome de error class semanticamente errado | 🟡 Warning | Corrigir antes do merge |
| Error code sem namespace `MODULO.` | 🟡 Warning | Corrigir antes do merge |
| Port interface ausente | 🟡 Warning | Corrigir antes do merge |
| Nomenclatura de arquivo fora do padrão | 🟡 Warning | Corrigir antes do merge |
| Método falível retornando `void` | 🟡 Warning | Corrigir antes do merge |
| Evento definido mas não despachado | 🟡 Warning | Corrigir antes do merge |
| Teste de transição de estado ausente | 🔵 Suggestion | Melhoria recomendada |
| Ausência de teste de evento publicado | 🔵 Suggestion | Melhoria recomendada |
| Use case implementado mas sem teste de tenant | 🔵 Suggestion | Melhoria recomendada |
| `application/ports/**` incluído no coverage threshold | 🔵 Suggestion | Melhoria recomendada |
