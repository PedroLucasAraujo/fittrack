# Core — Fundações de Domínio (`@fittrack/core`)

> **Contexto:** Shared Kernel / Biblioteca de Fundação | **Atualizado em:** 2026-02-28 | **Versão ADR baseline:** ADR-0051

O pacote `@fittrack/core` é o **núcleo compartilhado** da plataforma FitTrack: uma biblioteca de primitivos de DDD (Domain-Driven Design) que fornece as bases sobre as quais todos os outros módulos são construídos. Aqui vivem o padrão Either/Result para tratamento de erros sem exceções, as classes-base de entidades e agregados, os Value Objects canônicos (UTCDateTime, LogicalDay, Money), o contrato de eventos de domínio, os erros estruturados, e utilitários de infraestrutura leve como geração de UUIDs e rastreamento de coleções. Nenhum módulo de negócio deve reimplementar qualquer uma dessas abstrações — elas sempre vêm de `@fittrack/core`.

---

## Visão Geral

### O que este módulo faz

`@fittrack/core` provê os blocos construtores comuns a todos os bounded contexts da plataforma. Cada primitivo resolve um problema recorrente de modelagem de domínio:

- **Either/DomainResult**: elimina o uso de exceções (`throw`) em operações que podem falhar por entrada inválida, retornando um tipo `Left` (erro) ou `Right` (sucesso) que força o chamador a lidar com ambos os casos explicitamente.
- **BaseEntity / AggregateRoot**: bases para entidades e raízes de agregado, com identidade por UUID imutável e suporte a locking otimista via campo `version`.
- **ValueObject**: base para objetos de valor imutáveis com igualdade estrutural.
- **UTCDateTime, LogicalDay, Money**: Value Objects canônicos para os três domínios de dados mais sensíveis na plataforma: tempo (UTC), datas de calendário contextuais ao fuso horário do usuário, e valores monetários em centavos inteiros.
- **UniqueEntityId**: wrapper tipado para UUIDv4, usado na interface de repositórios.
- **DomainEvent / BaseDomainEvent**: contrato de evento de domínio e classe-base que auto-preenche `eventId` e `occurredAtUtc`.
- **DomainError / DomainInvariantError / ConcurrencyConflictError**: hierarquia de erros estruturados com campo `code` tipado.
- **ErrorCodes**: registro canônico de todos os códigos de erro da plataforma.
- **invariant()**: função de asserção para invariantes internas de agregados.
- **WatchedList**: rastreamento de mudanças em coleções de entidades subordinadas, para otimização de INSERTs/DELETEs no repositório.
- **IRepository\<T\>**: interface base para todos os repositórios de agregados.
- **PageRequest / PaginatedResult**: tipos para consultas paginadas.
- **generateId()**: gerador canônico de UUIDv4 via `crypto.randomUUID()`.

### O que este módulo NÃO faz

- **Não contém lógica de negócio:** nenhuma regra de domínio específica de FitTrack vive aqui.
- **Não contém casos de uso (application layer):** nenhum `UseCase`, nenhum DTO de entrada/saída.
- **Não acessa banco de dados, Redis ou HTTP:** zero dependências de infraestrutura.
- **Não gerencia eventos de domínio em runtime:** o `AggregateRoot` contém `addDomainEvent/getDomainEvents/clearDomainEvents` reservados para uma eventual adoção de event-sourcing, mas esses métodos **não devem ser chamados** no código atual (ADR-0009 §10 — padrões proibidos).
- **Não registra nem roteia eventos:** o dispatch de eventos é responsabilidade dos use cases via portas de aplicação.

### Módulos com os quais se relaciona

Todos os bounded contexts da plataforma dependem de `@fittrack/core` como shared kernel. A dependência é **unidirecional**: `@fittrack/core` nunca importa de nenhum módulo de negócio.

| Módulo         | Tipo de relação         | O que importa de `@fittrack/core`                                    |
| -------------- | ----------------------- | -------------------------------------------------------------------- |
| identity       | Consome primitivos de   | `BaseEntity`, `AggregateRoot`, `ValueObject`, `DomainResult`, erros, `generateId` |
| billing        | Consome primitivos de   | `AggregateRoot`, `UTCDateTime`, `Money`, `DomainResult`, `BaseDomainEvent`, `IRepository`, `generateId` |
| catalog        | Consome primitivos de   | `AggregateRoot`, `ValueObject`, `UTCDateTime`, `DomainResult`, `BaseDomainEvent`, `IRepository`, `generateId` |
| scheduling     | Consome primitivos de   | `AggregateRoot`, `LogicalDay`, `UTCDateTime`, `DomainResult`, `WatchedList`, `generateId` |
| assessments    | Consome primitivos de   | `AggregateRoot`, `ValueObject`, `DomainResult`, `BaseDomainEvent`, `IRepository`, `generateId` |
| (todos)        | Consome primitivos de   | `ErrorCodes`, `DomainError`, `DomainInvariantError`, `invariant`     |

---

## Primitivos Exportados

> Esta seção documenta cada primitivo público, suas regras de uso e quando utilizá-lo.

---

### Either / DomainResult — Resultados tipados sem exceções

**O que é:** O padrão Either é a fundação do tratamento de erros em toda a plataforma. Em vez de lançar exceções (`throw`) para erros esperados (validação de entrada, transição de estado inválida, recurso não encontrado), as funções retornam um `Either<L, R>` que é ou um `Left` (falha) ou um `Right` (sucesso). O chamador é forçado pelo sistema de tipos do TypeScript a verificar qual dos dois recebeu antes de acessar o valor.

**Por que usamos:** Exceções em JavaScript são invisíveis no tipo de retorno da função — o chamador não sabe que pode falhar. Com `Either`, a assinatura da função documenta explicitamente que ela pode falhar, e o TypeScript não deixa o código compilar se o `Left` for ignorado.

| Tipo / Função          | O que representa                                               | Quando usar                                      |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `Left<L, R>`           | Lado de falha; `.value` é o erro (`L`)                         | Operação falhou                                  |
| `Right<L, R>`          | Lado de sucesso; `.value` é o resultado (`R`)                  | Operação bem-sucedida                            |
| `Either<L, R>`         | União discriminada `Left | Right`; discrimina por `isLeft()` / `isRight()` ou `_tag` | Tipo de retorno declarado |
| `left(value)`          | Factory para `Left`; prefira sobre `new Left()`               | Retornar um erro                                 |
| `right(value)`         | Factory para `Right`; prefira sobre `new Right()`             | Retornar um resultado bem-sucedido               |
| `DomainResult<T>`      | Alias canônico: `Either<DomainError, T>`                      | Tipo de retorno de todos os métodos de domínio e use cases |

**Exemplo de uso:**
```typescript
function dividir(a: number, b: number): DomainResult<number> {
  if (b === 0) return left(new DomainInvariantError('divisão por zero', ErrorCodes.INVALID_ARGUMENT));
  return right(a / b);
}
const resultado = dividir(10, 2);
if (resultado.isRight()) console.log(resultado.value); // 5
if (resultado.isLeft())  console.log(resultado.value.code); // código do erro
```

---

### BaseEntity — Base para Entidades

**O que é:** Classe abstrata que identifica uma entidade por seu `id` (UUIDv4). Duas instâncias com o mesmo `id` representam a mesma entidade, independentemente do valor atual de seus `props`.

**Regras:**
- O `id` é validado como UUIDv4 no construtor — passar qualquer outro formato lança `DomainInvariantError` imediatamente (falha rápida, nunca persiste um estado inválido).
- **Raízes de agregado devem estender `AggregateRoot`, não `BaseEntity` diretamente.** `BaseEntity` é para entidades subordinadas que vivem dentro do limite de um agregado e nunca são acessadas diretamente por ID de fora.
- Igualdade por identidade: `equals(other)` compara apenas os `id`s.

| Método / Getter | O que faz                                                         |
| --------------- | ----------------------------------------------------------------- |
| `id`            | Retorna o UUID string imutável                                    |
| `equals(other)` | `true` se os dois `id`s forem iguais (identidade, não estrutura)  |

---

### AggregateRoot — Base para Raízes de Agregado

**O que é:** Estende `BaseEntity` e acrescenta suporte a locking otimista e uma coleção de eventos de domínio (reservada para event-sourcing futuro). **Toda raiz de agregado deve estender `AggregateRoot`.**

**Locking otimista (ADR-0006):**
- `version` começa em `0` para novos agregados.
- O repositório incrementa `version` em cada `save()` bem-sucedido e inclui o `version` carregado no `WHERE` do UPDATE.
- Se a versão não bater (outro processo salvou entre o load e o save), o repositório lança `ConcurrencyConflictError`.
- Ao reconstituir do banco, passe o `version` persistido no construtor: `new MinhaEntidade(id, props, versaoPersistida)`.

**Eventos de domínio (reservado para event-sourcing):**
- `addDomainEvent(event)` — registra um evento na coleção interna. **Proibido no código atual** (ADR-0009 §10). O dispatch de eventos é feito pelo use case, não pelo agregado.
- `getDomainEvents()` — retorna cópia imutável dos eventos registrados.
- `clearDomainEvents()` — limpa a coleção após dispatch.

| Getter / Método         | O que faz                                                                  |
| ----------------------- | -------------------------------------------------------------------------- |
| `version`               | Número atual da versão de locking otimista (somente leitura)               |
| `addDomainEvent(event)` | Registra evento na coleção interna (**reservado — não usar no código atual**) |
| `getDomainEvents()`     | Retorna cópia readonly dos eventos registrados                             |
| `clearDomainEvents()`   | Limpa a coleção de eventos                                                 |

---

### UniqueEntityId — Identidade Tipada de Entidade

**O que é:** Value Object que encapsula um UUIDv4 string e é usado nas interfaces de repositório como tipo do parâmetro de `findById`. Garante em nível de tipo que apenas UUIDs válidos são passados como identificadores.

| Factory / Getter | O que faz                                                                               |
| ---------------- | --------------------------------------------------------------------------------------- |
| `generate()`     | Gera um novo UUIDv4 aleatorizado criptograficamente. Sempre sucede.                     |
| `create(value)`  | Encapsula um UUID existente; retorna `Left<DomainInvariantError>` se não for UUIDv4 válido |
| `value`          | Retorna o UUID string                                                                   |
| `toString()`     | Retorna o UUID string                                                                   |
| `equals(other)`  | Igualdade estrutural por valor                                                           |

**Erro gerado:** `INVALID_UUID` quando o valor não é UUIDv4.

---

### ValueObject — Base para Value Objects

**O que é:** Classe abstrata para objetos de valor — primitivos de domínio sem identidade própria, identificados exclusivamente pelo seu valor. São imutáveis por design: `props` é congelado (deep freeze) no construtor.

**Regras:**
- `props` é congelado recursivamente no construtor via `deepFreeze`. Objetos `Date` dentro de `props` são exceção ao deepFreeze (pois `Object.freeze` não bloqueia mutações via métodos de `Date`); subclasses que contêm `Date` devem retornar cópias defensivas em seus getters.
- Igualdade estrutural: `equals(other)` compara recursivamente todos os campos de `props`. Campos `Date` são comparados por timestamp (`getTime()`).
- Subclasses expõem apenas getters — nenhum setter é permitido.
- Value objects são substituídos, nunca mutados: para "alterar" um VO, cria-se um novo com os valores desejados.

---

### UTCDateTime — Instante UTC

**O que é:** Value Object que representa um instante no tempo em UTC, conforme ADR-0010. Armazena um `Date` internamente e sempre serializa como ISO 8601 terminando em `Z`.

**Por que não usamos `Date` diretamente:** `Date` é mutável (`setFullYear()` etc.) e não documenta em seu tipo que é UTC. `UTCDateTime` garante imutabilidade via cópia defensiva e rejeita strings com offset (ex: `+03:00`).

| Factory / Método   | O que faz                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `now()`            | Cria um `UTCDateTime` representando o instante atual. Sempre sucede.                           |
| `from(date)`       | Cria a partir de um `Date` existente (cópia defensiva). Rejeita `Invalid Date`.                |
| `fromISO(iso)`     | Cria a partir de uma string ISO 8601. **A string deve terminar em `Z`** — offsets são rejeitados. |
| `value`            | Retorna **cópia defensiva** do `Date` interno                                                   |
| `toISO()`          | Retorna string ISO 8601 com sufixo `Z` — use para persistência e serialização                  |
| `toString()`       | Delega para `toISO()`                                                                           |

**Erro gerado:** `TEMPORAL_VIOLATION` para string sem `Z`, para string não-parseable, ou para `Date` inválida.

**Convenção de nomenclatura (ADR-0010):** campos de timestamp em entidades terminam em `Utc` — ex: `createdAtUtc`, `occurredAtUtc`.

---

### LogicalDay — Data de Calendário Contextual ao Fuso Horário

**O que é:** Value Object que representa uma **data de calendário** (`YYYY-MM-DD`) do ponto de vista do fuso horário do usuário no momento em que um evento de negócio ocorreu. É um conceito de negócio, não uma derivação de UTC em tempo de consulta.

**Regra fundamental (ADR-0010 §5):** uma vez registrado em uma entidade, o `logicalDay` é **imutável e nunca é recomputado**, mesmo se o usuário mudar seu fuso horário, se o banco IANA atualizar regras de DST, ou em migrações.

**Regra de cálculo (ADR-0010 §2):**
```
logicalDay = toLocalDate(occurredAtUtc, timezoneUsed)
```

> **Exemplo:** `occurredAtUtc = 2024-03-15T02:30:00Z`, `timezoneUsed = "America/Sao_Paulo"` (UTC-3) → `logicalDay = "2024-03-14"` (14 de março, não 15).

| Factory / Método          | O que faz                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `create(isoString)`       | Reconstitui a partir de uma string `YYYY-MM-DD` já armazenada. Valida formato E semântica de calendário (fev 29 em anos não-bissextos, etc.). |
| `fromDate(date, timezone)` | **Factory autoritativa** para criação: converte um `Date` UTC + timezone IANA para a data local correspondente. Use este em toda criação de entidade. |
| `value`                   | Retorna a string `YYYY-MM-DD`                                                                       |
| `toString()`              | Retorna a string `YYYY-MM-DD`                                                                       |

**Erros gerados:**
- `INVALID_LOGICAL_DAY`: formato inválido, data impossível (fevereiro 30, dia 32, etc.), ou dia 29 de fevereiro em ano não-bissexto.
- `INVALID_TIMEZONE`: identificador IANA de timezone inválido ou não reconhecido.

---

### Money — Valor Monetário

**O que é:** Value Object que representa um valor monetário como um **inteiro em centavos** (ou a menor unidade da moeda) mais um código de moeda ISO 4217. Nunca usa ponto flutuante para cálculos — `0.1 + 0.2 === 0.30000000000000004` em JavaScript.

**Por que centavos inteiros (ADR-0004):** aritmética de ponto flutuante em JavaScript introduz erros de precisão imperceptíveis em somas individuais, mas acumuláveis em volume. Toda lógica de negócio financeira opera sobre o campo `amount` (inteiro). `toDecimal()` existe apenas para exibição.

> **Exemplo:** R$ 99,90 → `Money.create(9990, 'BRL')` — `amount = 9990`, `currency = "BRL"`.

| Factory / Getter   | O que faz                                                                          |
| ------------------ | ---------------------------------------------------------------------------------- |
| `create(amount, currency)` | Cria o Value Object. Rejeita floats, negativos e códigos de moeda inválidos. |
| `amount`           | Valor inteiro em centavos (ou menor unidade). Sempre não-negativo.                 |
| `currency`         | Código ISO 4217 de 3 letras maiúsculas (ex: `"BRL"`, `"USD"`)                     |
| `toDecimal()`      | Divide `amount` por 100. **Somente para exibição — nunca para cálculos.**          |
| `toString()`       | Ex: `"99.90 BRL"`                                                                  |

**Erros gerados:**
- `INVALID_MONEY_VALUE`: `amount` não é inteiro, ou é negativo.
- `INVALID_CURRENCY`: código não tem exatamente 3 letras maiúsculas ASCII.

---

### DomainEvent (interface) — Contrato de Evento de Domínio

**O que é:** Interface que define o contrato canônico de todos os eventos de domínio da plataforma (ADR-0009). Todo evento publicado por qualquer bounded context deve implementar esta interface.

| Campo          | Tipo     | O que representa                                                                     |
| -------------- | -------- | ------------------------------------------------------------------------------------ |
| `eventId`      | `string` | UUID único do evento — usado como chave de idempotência pelos consumidores           |
| `eventType`    | `string` | Nome PascalCase no passado: ex `"ExecutionRecorded"`. Nomes imperativos são proibidos. |
| `eventVersion` | `number` | Versão do schema, começa em `1`. Incrementa em mudanças **quebradoras** (remoção ou renomeação de campo). Adições de campos opcionais não incrementam. |
| `occurredAtUtc`| `string` | ISO 8601 UTC terminando em `Z` (ADR-0010)                                            |
| `aggregateId`  | `string` | UUIDv4 da raiz de agregado que produziu o evento                                     |
| `aggregateType`| `string` | Nome do tipo da raiz de agregado (ex: `"Execution"`, `"Booking"`)                   |
| `tenantId`     | `string` | `professionalProfileId` para eventos tenant-scoped; `"PLATFORM"` para eventos globais (ADR-0025) |
| `payload`      | `Readonly<Record<string, unknown>>` | Dados específicos do evento. **Nunca PII** — somente IDs de referência (ADR-0037). Consumidores devem tolerar campos desconhecidos (forward-compatibility). |

---

### BaseDomainEvent — Implementação Base de Eventos

**O que é:** Classe abstrata que implementa `DomainEvent` e preenche automaticamente `eventId` (novo UUIDv4) e `occurredAtUtc` no construtor. Subclasses concretas declaram `eventType`, `aggregateId`, `aggregateType`, `tenantId` e `payload`.

| Campo preenchido automaticamente | Regra                                          |
| -------------------------------- | ---------------------------------------------- |
| `eventId`                        | Novo UUIDv4 via `generateId()` a cada instância |
| `occurredAtUtc`                  | `new Date().toISOString()` no momento da construção |
| `eventVersion`                   | Padrão `1`; passado como argumento `super(version)` |

**Exemplo de subclasse:**
```typescript
export class ExecutionRecorded extends BaseDomainEvent {
  readonly eventType = 'ExecutionRecorded' as const;
  readonly aggregateType = 'Execution' as const;
  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ExecutionRecordedPayload>,
  ) { super(1); }
}
```

---

### Hierarquia de Erros

**O que é:** Sistema de erros estruturados. Toda falha de domínio é representada como uma subclasse de `DomainError`, carregando um `code` tipado de `ErrorCodes`. A camada de apresentação usa o `code` para mapear para status HTTP sem fazer string matching em `message`.

```
Error (nativo)
  └── DomainError (abstrata — base para todos os erros de domínio)
        ├── DomainInvariantError  — invariante violada (valor inválido, transição proibida)
        └── ConcurrencyConflictError — versão de locking otimista divergiu (HTTP 409)
```

**`DomainError` (abstrata):**
- `message`: descrição legível por humanos (nunca para parsing programático).
- `code: ErrorCode`: código tipado do registry `ErrorCodes`.
- `context?`: objeto frozen com dados diagnósticos não-PII (IDs, valores recebidos).
- `name`: reflete o nome da subclasse concreta (ex: `"DomainInvariantError"`).

**`DomainInvariantError`:** levantada quando um invariante de domínio é violado — valor fora do intervalo permitido, transição de estado inválida, campo obrigatório ausente. Pode ser erro de entrada do usuário (tratado via `DomainResult`) ou erro de programação (detectado via `invariant()`).

**`ConcurrencyConflictError`:** levantada pelo repositório quando o `version` carregado diverge do `version` no banco no momento do save. É uma **condição retentável** — não um erro de validação. O cliente deve recarregar o agregado e re-submeter.

---

### ErrorCodes — Registro Canônico de Códigos de Erro

**O que é:** Objeto `as const` com todos os códigos de erro da plataforma. Todo `DomainError` deve usar um código deste registro — jamais strings literais avulsas.

| Código                    | Categoria        | Quando ocorre                                                                 |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `INVALID_UUID`            | Identidade       | ID de entidade/agregado não é UUIDv4 válido (ADR-0047 §6)                    |
| `TEMPORAL_VIOLATION`      | Temporal         | Timestamp UTC inválido: string sem `Z`, data não-parseable, `Date` inválido  |
| `INVALID_LOGICAL_DAY`     | Temporal         | `logicalDay` mal formatado ou data de calendário impossível                  |
| `INVALID_TIMEZONE`        | Temporal         | Identificador IANA de timezone inválido ou não reconhecido                   |
| `INVALID_MONEY_VALUE`     | Financeiro       | `amount` não é inteiro não-negativo                                          |
| `INVALID_CURRENCY`        | Financeiro       | Código de moeda não é 3 letras ISO 4217 maiúsculas                           |
| `INVALID_STATE_TRANSITION`| Estado           | Transição de status não listada na máquina de estados da entidade (ADR-0008) |
| `CONCURRENCY_CONFLICT`    | Concorrência     | Locking otimista: versão divergiu entre load e save (ADR-0006)               |
| `ACCESS_DENIED`           | Autorização      | Ator não tem permissão para a operação (ADR-0024)                            |
| `NOT_FOUND`               | Geral            | Agregado ou entidade não encontrado no repositório                           |
| `INVALID_ARGUMENT`        | Geral            | Argumento falha pré-condição não coberta pelos códigos acima                 |

> **Nota:** Módulos de bounded context definem seus próprios códigos prefixados (ex: `CATALOG.CATALOG_ITEM_NOT_FOUND`, `BILLING.ACCESS_GRANT_NOT_FOUND`). Esses são declarados nos próprios módulos como objetos separados; a union type `ErrorCode` de `@fittrack/core` cobre apenas os códigos deste registry.

---

### invariant() — Asserção de Invariante

**O que é:** Função de asserção para uso dentro de métodos de domínio em agregados e value objects. Se a condição for `false`, lança `DomainInvariantError` imediatamente. O tipo de retorno TypeScript `asserts condition` garante o narrowing de tipos para o código que segue a chamada.

**Quando usar `invariant()` vs `DomainResult<T>`:**

| Cenário | Abordagem recomendada |
| --- | --- |
| Entrada de ator externo (usuário, API, evento) | `DomainResult<T>` — retornar `Left` de uma factory |
| Guard interno que deve ser verdadeiro por construção | `invariant()` — lançar em erro de programação |
| Guard de transição de estado dentro de um método de agregado | `invariant()` — chamador é responsável por pré-verificar |

> **Regra de ouro:** use `invariant()` apenas para condições que são *impossíveis* de violar se a camada de aplicação estiver corretamente implementada. Se a condição pode ser violada por entrada válida do usuário, use uma factory retornando `DomainResult<T>`.

---

### WatchedList — Rastreamento de Mudanças em Coleções

**O que é:** Classe abstrata para rastrear adições e remoções em coleções de entidades subordinadas dentro de um agregado. Permite que o repositório emita apenas os INSERTs e DELETEs necessários, em vez de apagar tudo e reinserir.

**Semântica de rastreamento:**
- `newItems`: itens adicionados na sessão atual que não estavam na coleção original → requerem INSERT.
- `removedItems`: itens presentes na coleção original que foram removidos na sessão atual → requerem DELETE.
- Re-adicionar um item removido cancela a remoção (sem INSERT, sem DELETE — já estava persistido).
- Remover um item que foi adicionado na sessão cancela a adição (sem INSERT, sem DELETE).

**Subclasses devem implementar:**
```typescript
abstract compareItems(a: T, b: T): boolean; // tipicamente: a.id === b.id
```

| Método               | O que faz                                                              |
| -------------------- | ---------------------------------------------------------------------- |
| `getItems()`         | Lista completa atual (inicial + adicionados − removidos). Retorna cópia. |
| `getNewItems()`      | Itens adicionados nesta sessão. Requerem INSERT. Retorna cópia.        |
| `getRemovedItems()`  | Itens removidos nesta sessão. Requerem DELETE. Retorna cópia.          |
| `add(item)`          | Adiciona item; cancela remoção se era item inicial; no-op se já está.  |
| `remove(item)`       | Remove item; cancela adição se era item novo; no-op se não está.       |

---

### IRepository\<T\> — Interface Base de Repositório

**O que é:** Interface mínima que todo repositório de agregado deve implementar ou estender. Define apenas as duas operações fundamentais. Operações adicionais (buscas por campos, paginação) são declaradas na interface específica de cada módulo (`I{AggregateName}Repository`).

**Regras (ADR-0004 §4):**
- `findById` retorna o agregado completo e válido ou `null`. Reconstituição parcial é proibida.
- Todas as associações necessárias são carregadas eagerly. Lazy loading é proibido.
- `save` trata tanto INSERT (novo agregado) quanto UPDATE (existente). O repositório detecta qual é necessário.

| Método               | Assinatura                              | O que faz                                       |
| -------------------- | --------------------------------------- | ----------------------------------------------- |
| `findById(id)`       | `(id: string) → Promise<T \| null>`     | Busca pelo ID string; retorna `null` se não existe |
| `save(entity)`       | `(entity: T) → Promise<void>`           | Persiste (INSERT ou UPDATE); gerencia `version` |

---

### PageRequest / PaginatedResult — Paginação

**O que é:** Tipos de dados para consultas paginadas usadas em métodos de repositório e read-models.

**`PageRequest`:**

| Campo  | Tipo     | Descrição                              |
| ------ | -------- | -------------------------------------- |
| `page` | `number` | Número da página, 1-indexado (mín: 1)  |
| `limit`| `number` | Itens máximos por página (mín: 1)      |

**`PaginatedResult<T>`:**

| Campo         | Tipo      | Descrição                                                     |
| ------------- | --------- | ------------------------------------------------------------- |
| `items`       | `T[]`     | Itens da página atual. Comprimento ≤ `limit`                  |
| `total`       | `number`  | Total de itens em todas as páginas (não apenas a atual)       |
| `page`        | `number`  | Número da página atual (1-indexado)                           |
| `limit`       | `number`  | Tamanho de página solicitado                                  |
| `hasNextPage` | `boolean` | `true` quando `page * limit < total`                          |

---

### generateId() — Gerador de UUIDv4

**O que é:** Função utilitária que gera um UUIDv4 criptograficamente seguro usando `crypto.randomUUID()` do Node.js nativo. É a **única fonte de geração de IDs** permitida na plataforma.

**Regra (ADR-0047 §6):** Todos os IDs de raízes de agregado e entidades devem ser gerados via `generateId()`. É proibido usar `Math.random()` ou bibliotecas UUID de terceiros para este fim.

---

## Regras de Uso Consolidadas

| #  | Regra                                                                                                                    | Onde se aplica          | ADR              |
| -- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------- |
| 1  | Toda operação de domínio que pode falhar retorna `DomainResult<T>` — nunca lança exceção para erros esperados           | Toda a plataforma        | ADR-0051         |
| 2  | Raízes de agregado estendem `AggregateRoot`; entidades subordinadas estendem `BaseEntity`                                | Toda a plataforma        | ADR-0047 §4      |
| 3  | Todos os IDs são UUIDv4 gerados via `generateId()` — proibido `Math.random()` ou UUID de terceiros                       | Toda a plataforma        | ADR-0047 §6      |
| 4  | Timestamps UTC usam `UTCDateTime`; strings ISO 8601 devem terminar em `Z`                                                | Toda a plataforma        | ADR-0010 §1      |
| 5  | `logicalDay` é computado uma vez na criação via `LogicalDay.fromDate(occurredAtUtc, timezoneUsed)` e nunca recomputado   | Toda a plataforma        | ADR-0010 §2, §5  |
| 6  | Valores monetários usam `Money` com inteiros em centavos — floats são rejeitados                                          | Módulo Billing e derivados | ADR-0004       |
| 7  | `invariant()` é para guards internos impossíveis de violar por entrada correta; entradas externas usam `DomainResult<T>` | Toda a plataforma        | ADR-0051         |
| 8  | `addDomainEvent()` no `AggregateRoot` é reservado para event-sourcing futuro — **proibido no código atual**              | Toda a plataforma        | ADR-0009 §10     |
| 9  | Payloads de eventos (`DomainEvent.payload`) nunca contêm PII — somente IDs de referência                                 | Toda a plataforma        | ADR-0037         |
| 10 | `eventType` em `DomainEvent` sempre é PascalCase no passado (ex: `"ExecutionRecorded"`) — nomes imperativos são proibidos | Toda a plataforma        | ADR-0009 §2      |
| 11 | `ConcurrencyConflictError` é condição retentável (HTTP 409) — o cliente deve recarregar e re-submeter                    | Repositórios             | ADR-0006         |
| 12 | `context` em `DomainError` nunca contém dados pessoais, dados de saúde ou valores financeiros                            | Toda a plataforma        | ADR-0037         |
| 13 | `DomainError.code` sempre referencia um código de `ErrorCodes` ou do registry do módulo — jamais string literal avulsa  | Toda a plataforma        | ADR-0008         |
| 14 | `WatchedList.getItems()`, `getNewItems()` e `getRemovedItems()` retornam cópias — mutações externas não afetam o estado interno | Agregados com coleções | —           |
| 15 | `ValueObject.props` é congelado em construção (deepFreeze); subclasses com `Date` retornam cópia defensiva em getters    | Value Objects            | ADR-0047 §4      |

---

## Conformidade com ADRs

| ADR                                           | Status       | Observações                                                                                  |
| --------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| ADR-0003 (Transações — um agregado por tx)    | ✅ Conforme  | `AggregateRoot` modela a fronteira de consistência; `IRepository.save` é atômico por agregado |
| ADR-0004 (Repositórios)                       | ✅ Conforme  | `IRepository<T>` define `findById` + `save`; implementações em infra; interfaces no domínio   |
| ADR-0006 (Concurrência Otimista)              | ✅ Conforme  | `AggregateRoot.version` + `ConcurrencyConflictError` implementam o contrato completo de ADR-0006 |
| ADR-0007 (Idempotência)                       | ✅ Conforme  | `DomainEvent.eventId` é UUIDv4 único por instância — chave de idempotência para consumidores |
| ADR-0008 (Lifecycle e State Machine)          | ✅ Conforme  | `ErrorCodes.INVALID_STATE_TRANSITION` é o código canônico para transições inválidas          |
| ADR-0009 (Domain Events)                      | ✅ Conforme  | Interface `DomainEvent` + `BaseDomainEvent` implementam o contrato; `addDomainEvent` marcado como reservado |
| ADR-0010 (Temporal Policy)                    | ✅ Conforme  | `UTCDateTime` rejeita strings sem `Z`; `LogicalDay.fromDate` é a factory autoritativa; imutabilidade pós-criação |
| ADR-0037 (Dados Sensíveis / LGPD)             | ✅ Conforme  | Documentado em `DomainError.context` e `DomainEvent.payload` que PII é proibido              |
| ADR-0047 (Aggregate Root Definition)          | ✅ Conforme  | `BaseEntity` para subordinadas; `AggregateRoot` para raízes; UUID via `generateId()`          |
| ADR-0051 (Domain Error Handling)              | ✅ Conforme  | `DomainResult<T>` = `Either<DomainError, T>`; nenhuma exceção em domínio; `invariant()` para guards internos |

---

## Gaps e Melhorias Identificadas

| #  | Tipo            | Descrição                                                                                                                                                            | Prioridade |
| -- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1  | 🔵 Pós-MVP      | `addDomainEvent()`, `getDomainEvents()` e `clearDomainEvents()` em `AggregateRoot` estão reservados para event-sourcing futuro (ADR-0009 §1.2). No estado atual, sempre retornam coleção vazia. Candidatos à remoção se a plataforma não adotar event-sourcing. | Baixa |
| 2  | 🔵 Informativo  | `ErrorCodes` da plataforma (registry em `core`) e os registries de módulos (`CatalogErrorCodes`, `BillingErrorCodes` etc.) são objetos separados com tipos distintos. Não há um tipo union que cubra todos os códigos da plataforma. Isso é intencional para evitar acoplamento entre módulos, mas documentar esse trade-off explicitamente pode evitar confusão. | Informativo |

---

## Cobertura de Testes

**144 testes unitários** (100% de cobertura em linhas, funções, branches e statements).

| Arquivo de testes                                    | Testes |
| ---------------------------------------------------- | ------ |
| `__tests__/either/either.test.ts`                    | 10     |
| `__tests__/entities/base-entity.test.ts`             | 8      |
| `__tests__/entities/aggregate-root.test.ts`          | 7      |
| `__tests__/entities/unique-entity-id.test.ts`        | 11     |
| `__tests__/value-objects/value-object.test.ts`       | 12     |
| `__tests__/value-objects/utc-date-time.test.ts`      | 15     |
| `__tests__/value-objects/logical-day.test.ts`        | 18     |
| `__tests__/value-objects/money.test.ts`              | 17     |
| `__tests__/errors/domain-invariant-error.test.ts`    | 9      |
| `__tests__/errors/concurrency-conflict-error.test.ts`| 6      |
| `__tests__/events/base-domain-event.test.ts`         | 6      |
| `__tests__/invariants/invariant.test.ts`             | 6      |
| `__tests__/utils/generate-id.test.ts`                | 4      |
| `__tests__/collections/watched-list.test.ts`         | 15     |

Destaques de cobertura: imutabilidade de `ValueObject` (deepFreeze, cópia defensiva de `Date`), semântica completa de `WatchedList` (cancelamento de adição/remoção, cenários compostos), `LogicalDay` com datas de borda (fevereiro 29 em anos bissextos/não-bissextos, meses de 30/31 dias, conversões de fuso horário cruzando meia-noite), `UTCDateTime` (rejeição de offsets, defesa de cópia, round-trip ISO), `Money` (limites de precisão, validação de currency), `invariant()` (narrowing de tipos, contexto), e `BaseDomainEvent` (unicidade de `eventId`, conformidade ISO do `occurredAtUtc`).

---

## Histórico de Atualizações

| Data       | O que mudou                 |
| ---------- | --------------------------- |
| 2026-02-28 | Documentação inicial gerada |
