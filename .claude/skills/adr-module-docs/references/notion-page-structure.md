# Referência: Estrutura de Páginas no Notion

Use este guia ao publicar documentação de módulos no Notion via claude.ai.

---

## Estrutura de Página Recomendada

Cada módulo ganha uma página própria dentro de uma página pai "📚 Documentação de Módulos".

```
📚 Documentação de Módulos
├── 🔐 Auth / Users
├── 👤 Professionals
├── 👥 Clients
├── 💳 Billing & Subscriptions
├── 🛍️ Products (One-Time)
├── ⚡ Executions
├── 📦 Deliverables
├── 🔔 Notifications
└── [outros módulos]
```

---

## Ícones por Módulo (sugestões)

| Módulo                  | Ícone |
| ----------------------- | ----- |
| auth / users            | 🔐    |
| professionals           | 👤    |
| clients                 | 👥    |
| billing / subscriptions | 💳    |
| products                | 🛍️    |
| executions              | ⚡    |
| deliverables            | 📦    |
| notifications           | 🔔    |
| shared kernel           | 🧩    |

---

## Propriedades da Página de Banco de Dados (se usar database)

Se os módulos forem páginas dentro de um database Notion:

| Propriedade        | Tipo   | Valores                                      |
| ------------------ | ------ | -------------------------------------------- |
| Status             | Select | `Documentado`, `Em revisão`, `Desatualizado` |
| Última atualização | Date   | —                                            |
| ADR baseline       | Text   | ex: `ADR-0051`                               |
| Bounded Context    | Select | nome do contexto                             |
| Conformidade       | Select | `✅ Conforme`, `⚠️ Parcial`, `❌ Violações`  |

---

## Fluxo de Publicação

1. Claude Code gera `docs/modules/[MODULO]-pt.md` no repositório
2. Você traz o conteúdo para o claude.ai (copia o arquivo ou pede para o Claude Code exibir)
3. Claude.ai cria ou atualiza a página no Notion via integração
4. A página é organizada dentro de "📚 Documentação de Módulos"

---

## Atualização de Página Existente

Ao atualizar uma página já existente:

1. Buscar a página pelo nome do módulo
2. Atualizar seção por seção (não substituir tudo de uma vez)
3. Atualizar a propriedade "Última atualização"
4. Adicionar entrada no "Histórico de Atualizações" da página
5. Se houver mudança de conformidade, atualizar a propriedade "Conformidade"
