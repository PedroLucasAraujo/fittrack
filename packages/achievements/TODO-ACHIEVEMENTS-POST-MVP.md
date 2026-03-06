# Sistema de Achievements - Funcionalidades Pos-MVP

## Tipos de Achievements Expandidos

### Baseados em Volume
- [ ] `VOLUME_10_TONS` - Levante 10 toneladas no total
- [ ] `VOLUME_50_TONS` - Levante 50 toneladas no total
- [ ] `VOLUME_100_TONS` - Levante 100 toneladas no total

### Baseados em Exercicios Especificos
- [ ] `SQUAT_100_REPS` - Complete 100 squats no total
- [ ] `BENCH_PRESS_1000_KG` - Levante 1000kg no bench press
- [ ] `DEADLIFT_5000_KG` - Levante 5000kg no deadlift

### Baseados em Assessments
- [ ] `FIRST_ASSESSMENT` - Complete primeira avaliacao
- [ ] `TEN_ASSESSMENTS` - Complete 10 avaliacoes
- [ ] `WEIGHT_LOSS_5KG` - Perca 5kg
- [ ] `MUSCLE_GAIN_2KG` - Ganhe 2kg de massa muscular

### Baseados em Nutrition
- [ ] `NUTRITION_7_DAYS` - Registre refeicoes por 7 dias consecutivos
- [ ] `CALORIE_TARGET_30_DAYS` - Atinja meta calorica por 30 dias
- [ ] `PROTEIN_TARGET_100_DAYS` - Atinja meta de proteina por 100 dias

### Achievements Combinados (Multi-Criterio)
- [ ] `WARRIOR_COMPLETE` - 100 workouts + 30 day streak + 20 ton volume
- [ ] `CONSISTENCY_KING` - 365 day streak + 500 workouts + 50 assessments
- [ ] Suporte para criterios AND/OR no `AchievementCriteria`

## Customizacao e Personalizacao

### Achievements por Profissional
- [ ] Profissional pode criar achievements customizados para seus clientes
- [ ] Template de achievement (profissional define criterios)
- [ ] Aprovacao/moderacao de achievements customizados

### Achievements Pessoais (Goals)
- [ ] Cliente pode criar achievements pessoais (metas proprias)
- [ ] "Perder 10kg em 3 meses" como achievement privado
- [ ] Compartilhar achievement pessoal com profissional

## Achievements Temporarios e Sazonais

### Challenges Temporarios
- [ ] `SUMMER_CHALLENGE_2025` - Achievement que expira
- [ ] Field `expiresAt` em `AchievementDefinition`
- [ ] Achievements sazonais (verao, inverno, natal)
- [ ] Event `AchievementExpiredEvent`

### Achievements Resetaveis
- [ ] `MONTHLY_STREAK` - Achievement que reseta todo mes
- [ ] `WEEKLY_WARRIOR` - Achievement semanal
- [ ] Field `isRepeatable = true` com logica de reset

## Recompensas e Incentivos

### Sistema de XP e Niveis
- [ ] Achievement da XP (pontos de experiencia)
- [ ] Usuario tem nivel baseado em XP total
- [ ] Achievements de nivel (LEVEL_10, LEVEL_50, LEVEL_100)
- [ ] Integracao com modulo de gamificacao

### Recompensas Tangiveis
- [ ] Achievement da desconto (integracao com Billing)
- [ ] Achievement desbloqueia feature premium (integracao com Platform Entitlements)
- [ ] Achievement da cupom de parceiros
- [ ] Marketplace de recompensas

### Reconhecimento Social
- [ ] Compartilhar achievement em redes sociais
- [ ] Feed de achievements desbloqueados (timeline social)
- [ ] Celebrar achievement de amigos (likes, comentarios)

## Ranking e Leaderboards

### Rankings Globais
- [ ] Leaderboard de usuarios com mais achievements
- [ ] Leaderboard por categoria (WORKOUT, STREAK, NUTRITION)
- [ ] Top 10 / Top 100 achievements raros

### Rankings por Achievement
- [ ] Quem desbloqueou "100 Workouts" primeiro (timestamp)
- [ ] Ranking de velocidade (quem desbloqueou mais rapido)

### Rarity Score
- [ ] Calcular % de usuarios que tem cada achievement
- [ ] Achievements raros valem mais (peso em ranking)
- [ ] Badge de "Rare" ou "Epic" baseado em rarity

## Notificacoes e UX

### Notificacoes Avancadas
- [ ] Email celebrando achievement desbloqueado
- [ ] Push notification com animacao
- [ ] In-app modal celebrando (confetti animation)
- [ ] Notificacao "Voce esta perto!" (90% progresso)

### Progresso Visual
- [ ] Progress bar animada
- [ ] Countdown para achievements temporarios
- [ ] Dicas de como desbloquear (hint system)
- [ ] "Next achievement" sugerido baseado em progresso

## Analytics e Insights

### Dashboard de Achievements
- [ ] Total de achievements desbloqueados
- [ ] Taxa de conclusao por categoria
- [ ] Grafico de progresso ao longo do tempo
- [ ] Achievements mais proximos de desbloquear

### Metricas para Profissionais
- [ ] Ver achievements de clientes
- [ ] Taxa de engajamento via achievements
- [ ] Achievements que mais motivam clientes

### Metricas para Plataforma
- [ ] Achievement com maior taxa de unlock
- [ ] Achievement mais raro
- [ ] Tempo medio para unlock por achievement
- [ ] Correlacao entre achievements e retencao

## Melhorias de Performance

### Caching
- [ ] Cache de definitions ativas (1h TTL)
- [ ] Cache de unlocked achievements por usuario (5min TTL)
- [ ] Invalidacao inteligente de cache

### Otimizacoes de Query
- [ ] Materialized view de progresses
- [ ] Indices compostos otimizados
- [ ] Batch processing de eventos (processar 100 eventos de uma vez)

### Event Sourcing Completo
- [ ] Reconstruir progresses a partir de eventos
- [ ] Replay de eventos para corrigir dados
- [ ] Auditoria completa de unlocks

## Indices de Banco de Dados (Pendentes)

```sql
-- Buscar progresses de um usuario
CREATE INDEX idx_user_achievement_progress_user ON user_achievement_progress (user_id);

-- Buscar progress especifico
CREATE INDEX idx_user_achievement_progress_user_definition ON user_achievement_progress (user_id, achievement_definition_id);

-- Buscar definitions ativas por metrica
CREATE INDEX idx_achievement_definition_active_metric ON achievement_definition (is_active, metric_type);
```

## Multi-Criterio e Rules Engine

### Criterios Complexos
- [ ] Suporte para AND/OR em `AchievementCriteria`
- [ ] Criterios condicionais (if X then Y)
- [ ] Time windows complexos (ultimos 30 dias, este mes)

### DSL para Criterios
- [ ] Expression language: `workout_count >= 100 AND streak_days >= 30`
- [ ] Parser de expressoes
- [ ] Validacao de sintaxe

## Compliance e Auditoria

### LGPD/GDPR
- [ ] Anonimizacao de achievements apos X tempo
- [ ] Direito ao esquecimento (deletar progresses)
- [ ] Export de dados de achievements

### Auditoria
- [ ] Log completo de unlock timestamps
- [ ] Historico de progresso (snapshots)
- [ ] Detectar comportamento suspeito (unlock muito rapido)

## Integracao com Outros Modulos

### Billing
- [ ] Achievement "First Payment" (primeira compra)
- [ ] Achievement "VIP Client" (alto ticket)
- [ ] Desconto automatico ao desbloquear achievement

### Platform Entitlements
- [ ] Achievement desbloqueia feature premium temporaria
- [ ] "Try Premium 7 Days" ao atingir 100 workouts

### Scheduling
- [ ] Achievement "Perfect Attendance" (100% presenca em bookings)
- [ ] Achievement "Early Bird" (chegar antes do horario X vezes)

## Infraestrutura (Pendente)

- [ ] `PrismaAchievementDefinitionRepository` - implementacao Prisma
- [ ] `PrismaUserAchievementProgressRepository` - implementacao Prisma
- [ ] `UserStatsQueryService` - anti-corruption layer querying Execution/Metrics DBs
- [ ] Schema Prisma para `achievement_definition` e `user_achievement_progress`
- [ ] Migrations de banco de dados

---

**Priorizacao Sugerida:**
1. **Wave 1**: Infraestrutura (Prisma repos + schema) + Achievements expandidos (volume, exercicios, assessments, nutrition)
2. **Wave 2**: Recompensas (XP, niveis, descontos)
3. **Wave 3**: Rankings e leaderboards
4. **Wave 4**: Achievements customizados por profissional
5. **Wave 5**: Achievements temporarios e sazonais
6. **Wave 6**: Multi-criterio e rules engine
