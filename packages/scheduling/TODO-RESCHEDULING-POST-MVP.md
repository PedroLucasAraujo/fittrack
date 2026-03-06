# Reagendamento de Bookings — Funcionalidades Pós-MVP

## Políticas Customizadas

### Por Profissional
- [ ] Profissional pode definir `minNoticeHours` customizado (ex: 48h em vez de 24h)
- [ ] Profissional pode definir `maxReschedules` customizado
- [ ] Profissional pode desativar reagendamento completamente
- [ ] Profissional pode ter blackout periods (feriados, férias)

### Por Plano/Serviço
- [ ] Planos premium permitem reagendamento de última hora (< 24h)
- [ ] Serviços específicos têm políticas diferentes (ex: avaliação vs treino)
- [ ] Clientes VIP têm limite maior de reagendamentos

## Workflow de Aprovação

### Reagendamento com Confirmação
- [ ] Cliente solicita → vira `PENDING_RESCHEDULE` → Profissional aprova/rejeita
- [ ] Profissional solicita → vira `PENDING_RESCHEDULE` → Cliente aprova/rejeita
- [ ] Timeout: pedido pendente expira após X dias
- [ ] Auto-aprovação se sem resposta em Y horas

### Aprovação Assimétrica
- [ ] Profissional pode reagendar instantaneamente (sem aprovação)
- [ ] Cliente sempre requer aprovação do profissional
- [ ] Configurável por tipo de serviço

## Taxas e Billing

### Taxa de Reagendamento
- [ ] Reagendamento grátis até 48h antes
- [ ] Taxa fixa após período de graça (ex: R$ 10)
- [ ] Taxa progressiva (1ª vez grátis, 2ª R$ 10, 3ª R$ 20)
- [ ] Integração com módulo Billing para cobrar taxa

### Créditos e Penalidades
- [ ] Reagendamento de última hora consome 1 crédito do pacote
- [ ] No-shows repetidos bloqueiam reagendamento
- [ ] Sistema de warnings (3 strikes)

## Sugestões Inteligentes

### Slots Alternativos
- [ ] Se horário não disponível, sugerir próximos 3 slots livres
- [ ] Algoritmo de sugestão baseado em histórico (horários preferidos do cliente)
- [ ] Considerar deslocamento (sugerir horários próximos ao original)

### Auto-Reagendamento
- [ ] Se profissional cancela disponibilidade, sistema sugere reagendamento automático
- [ ] Cliente pode aceitar/rejeitar sugestão em 1 clique
- [ ] Priorizar clientes por ordem de agendamento original

## Notificações e Lembretes

### Notificações Avançadas
- [ ] Email/SMS para ambas as partes ao reagendar
- [ ] Push notification em tempo real
- [ ] Resumo semanal de bookings reagendados
- [ ] Alerta se reagendamento próximo ao limite (ex: faltam 2h para 24h)

### Lembretes Customizados
- [ ] Lembrete 24h antes do booking reagendado
- [ ] Confirmação de comparecimento após reagendamento
- [ ] Follow-up se cliente reagendou múltiplas vezes

## Histórico e Analytics

### Histórico Detalhado
- [ ] Timeline completa de todos reagendamentos do booking
- [ ] Diff visual (old vs new time)
- [ ] Razão do reagendamento (campo obrigatório)
- [ ] Histórico de quem solicitou (cliente vs profissional)

### Métricas e Dashboards
- [ ] Taxa de reagendamento por profissional
- [ ] Horários mais reagendados (identificar padrões)
- [ ] Clientes com alta taxa de reagendamento (flag de risco)
- [ ] Impacto no revenue (tempo perdido com slots vazios)
- [ ] Gráfico de reagendamentos ao longo do tempo

### Relatórios
- [ ] Relatório mensal de reagendamentos
- [ ] Comparação entre profissionais (benchmark)
- [ ] Análise de motivos de reagendamento (categorização)

## Integrações Externas

### Google Calendar
- [ ] Sync automático de reagendamento para Google Calendar
- [ ] Two-way sync (mudar no Google → atualiza FitTrack)
- [ ] Detecção de conflitos com eventos externos

### Outros Calendários
- [ ] Outlook/Office 365 sync
- [ ] Apple Calendar sync
- [ ] iCal export

### Webhooks
- [ ] Notificar sistemas externos via webhook ao reagendar
- [ ] Payload customizável
- [ ] Retry policy para webhooks falhados

## UX e Automações

### Assistente de Reagendamento
- [ ] Chatbot que sugere melhores horários
- [ ] "Reagendar para mesmo dia/horário na próxima semana"
- [ ] "Reagendar todos bookings de um período" (ex: férias)

### Drag & Drop Calendar
- [ ] Interface visual para arrastar booking para novo horário
- [ ] Validação em tempo real (conflitos, disponibilidade)
- [ ] Preview antes de confirmar

### Undo Reagendamento
- [ ] Desfazer reagendamento em X minutos (grace period)
- [ ] Restaurar horário original com 1 clique
- [ ] Histórico de undos (auditoria)

## Regras de Negócio Avançadas

### Reagendamento em Cascata
- [ ] Se reagendar booking de pacote, reagendar todas sessões subsequentes
- [ ] Manter intervalo entre sessões (ex: 2x por semana)
- [ ] Confirmar alterações em massa

### Priorização de Slots
- [ ] Clientes com streak alto têm prioridade em horários disputados
- [ ] Clientes que nunca reagendaram têm vantagem
- [ ] Sistema de fila de espera para horários populares

### Limites Dinâmicos
- [ ] `maxReschedules` aumenta com tempo de relacionamento
- [ ] `minNoticeHours` diminui para clientes VIP
- [ ] Política adapta baseado em histórico de comportamento

## Compliance e Auditoria

### LGPD/GDPR
- [ ] Anonimização de histórico de reagendamento após X meses
- [ ] Direito ao esquecimento (deletar histórico)
- [ ] Consentimento explícito para notificações

### Auditoria Avançada
- [ ] Log completo de todas operações (IP, device, timestamp)
- [ ] Imutabilidade de eventos (event sourcing completo)
- [ ] Relatórios de compliance para auditorias

### Fraude e Abuso
- [ ] Detecção de padrões suspeitos (reagendamentos excessivos)
- [ ] Rate limiting por usuário (máximo X reagendamentos por dia)
- [ ] Bloqueio temporário por abuso

## Performance

### Caching
- [ ] Cache de slots disponíveis (1-5min TTL) via Redis (ADR-0016)
- [ ] Invalidação ao criar/reagendar/cancelar booking
- [ ] CDN para calendários de profissionais populares

### Otimizações de Query
- [ ] Materialized views para disponibilidade
- [ ] Índices compostos otimizados (idx_bookings_professional_time)
- [ ] Particionamento de tabela bookings por data

### Escala
- [ ] Queue assíncrona para processar reagendamentos em massa
- [ ] Event sourcing para reconstruir estado
- [ ] Sharding por profissional

## Banco de Dados — Índices Recomendados

```sql
-- Para findConflictingBookings
CREATE INDEX idx_bookings_professional_time
ON bookings (professional_profile_id, scheduled_at_utc);

-- Para queries de cliente
CREATE INDEX idx_bookings_client
ON bookings (client_id, scheduled_at_utc);

-- Para queries por status
CREATE INDEX idx_bookings_status
ON bookings (status, scheduled_at_utc);
```

---

**Priorização Sugerida:**
1. **Wave 1**: Políticas customizadas + Notificações avançadas + Taxas básicas
2. **Wave 2**: Workflow de aprovação + Sugestões inteligentes + Histórico detalhado
3. **Wave 3**: Analytics e dashboards + Integrações (Google Calendar)
4. **Wave 4**: Automações (assistente, drag&drop) + UX melhorias
5. **Wave 5**: Reagendamento em cascata + Limites dinâmicos + Event sourcing completo
