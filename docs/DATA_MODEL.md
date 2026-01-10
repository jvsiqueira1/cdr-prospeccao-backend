# Backend — Data Model

Documentação do schema Prisma (`prisma/schema.prisma`).

## Diagrama de Relações

```
User (1)
 ├──< Lead (N)
 │     ├──< HistoricoContato (N)
 │     └──< Briefing (N)
 │
 ├──1 Gamificacao (1)
 │     └──< MissaoDiaria (N)
 │
 ├──< MetricasDiarias (N)
 ├──< Session (N)
 ├──< Account (N)
 └──< Verification (N)
```

---

## Enums

### Cadencia
Frequência de contato com o lead.

| Valor | Descrição |
|-------|-----------|
| `Semanal` | Contato a cada 7 dias |
| `Quinzenal` | Contato a cada 15 dias |
| `Mensal` | Contato a cada 30 dias |

### Status
Estado do lead em relação ao próximo contato.

| Valor | Descrição |
|-------|-----------|
| `Atrasado` | Próximo contato já passou |
| `FalarHoje` | Próximo contato é hoje |
| `EmDia` | Próximo contato no futuro |
| `Convertido` | Lead convertido em cliente |

### Temperatura
Nível de interesse do lead.

| Valor | Descrição |
|-------|-----------|
| `Frio` | Baixo interesse |
| `Morno` | Interesse moderado |
| `Quente` | Alto interesse |

### Prioridade
Urgência de ação no lead.

| Valor | Descrição |
|-------|-----------|
| `Urgente` | Ação imediata necessária |
| `Alerta` | Ação em breve |
| `Atencao` | Monitorar |
| `Normal` | Sem urgência |

### Origem
Canal de aquisição do lead.

| Valor |
|-------|
| `Instagram` |
| `Indicacao` |
| `Anuncio` |
| `Evento` |
| `WhatsApp` |
| `Organico` |
| `LinkedIn` |
| `Site` |
| `Outro` |

### TipoContato
Tipo de interação registrada.

| Valor |
|-------|
| `Ligacao` |
| `WhatsApp` |
| `Email` |
| `Reuniao` |
| `Visita` |
| `Outro` |

---

## Modelos de Autenticação (Better Auth)

### User

Usuário central do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String | ID único (cuid) |
| `email` | String | Email (único) |
| `name` | String? | Nome do usuário |
| `emailVerified` | Boolean | Email verificado |
| `image` | String? | URL da imagem |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Última atualização |

**Relações:**
- `leads` → Lead[]
- `gamificacao` → Gamificacao?
- `metricas` → MetricasDiarias[]
- `sessions` → Session[]
- `accounts` → Account[]
- `verifications` → Verification[]

### Account

Contas de autenticação (email/senha ou OAuth).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String | ID único |
| `userId` | String | FK para User |
| `providerId` | String | Provedor (email, google, etc) |
| `accountId` | String | ID na conta do provedor |
| `password` | String? | Senha hash (para email/senha) |
| `accessToken` | String? | Token OAuth |
| `refreshToken` | String? | Refresh token OAuth |

**Índices:** `[providerId, accountId]` (único), `[userId]`

### Session

Sessões ativas do usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String | ID único |
| `userId` | String | FK para User |
| `token` | String | Token da sessão (único) |
| `expiresAt` | DateTime | Expiração |
| `ipAddress` | String? | IP do cliente |
| `userAgent` | String? | User-Agent |

**Índices:** `[userId]`, `[token]`

### Verification

Tokens de verificação (email, reset senha).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String | ID único |
| `identifier` | String | Tipo de verificação |
| `value` | String | Token |
| `expiresAt` | DateTime | Expiração |
| `userId` | String? | FK opcional para User |

---

## Modelos de Negócio

### Lead

Prospect de vendas.

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | String | cuid() | ID único |
| `userId` | String | - | FK para User (dono) |
| `nome` | String | - | Nome do lead |
| `cidade` | String | - | Cidade |
| `origem` | Origem | - | Canal de aquisição |
| `telefone` | String | - | Telefone |
| `codigo` | String | - | Código interno |
| `cadencia` | Cadencia | - | Frequência de contato |
| `ultimoContato` | DateTime? | null | Data do último contato |
| `proximoContato` | DateTime? | null | Data do próximo contato |
| `status` | Status | EmDia | Status calculado |
| `temperatura` | Temperatura | Frio | Nível de interesse |
| `observacao` | String | "" | Observações gerais |
| `prioridade` | Prioridade | Normal | Prioridade calculada |
| `score` | Int | 0 | Score calculado |
| `dataEntrada` | DateTime | now() | Data de cadastro |
| `dataConversao` | DateTime? | null | Data de conversão |
| `pontos` | Int | 0 | Pontos do lead |
| `nivel` | String | "Prospectador Iniciante" | Nível |
| `conquistas` | String[] | [] | Lista de conquistas |

**Relações:**
- `user` → User
- `historico` → HistoricoContato[]
- `briefings` → Briefing[]

**Índices:** `[status]`, `[temperatura]`, `[prioridade]`, `[userId]`

### HistoricoContato

Registro de cada contato com o lead.

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | String | cuid() | ID único |
| `leadId` | String | - | FK para Lead |
| `data` | DateTime | now() | Data do contato |
| `tipo` | TipoContato | - | Tipo de contato |
| `temperatura` | Temperatura | - | Temperatura no momento |
| `status` | Status | - | Status no momento |
| `resumo` | String | - | Resumo da conversa |
| `proximoPasso` | String | - | Próximo passo definido |
| `responsavel` | String | - | Quem fez o contato |

**Índices:** `[leadId]`, `[data]`

### Briefing

Documentação detalhada de conversas.

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | String | cuid() | ID único |
| `leadId` | String | - | FK para Lead |
| `data` | DateTime | now() | Data do briefing |
| `tipoContato` | TipoContato | - | Tipo de contato |
| `objetivo` | String | - | Objetivo da conversa |
| `conversa` | String | - | Conteúdo da conversa |
| `resultado` | String | - | Resultado obtido |
| `interesseDemonstrado` | String | - | Interesses identificados |
| `objecoes` | String | - | Objeções levantadas |
| `proximoPasso` | String | - | Próximo passo |
| `proximoFollowUp` | DateTime? | null | Data do próximo follow-up |
| `temperaturaAtualizada` | Temperatura | - | Nova temperatura |

**Índices:** `[leadId]`, `[data]`

### Gamificacao

Estatísticas de gamificação do usuário.

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | String | cuid() | ID único |
| `userId` | String | - | FK para User (único) |
| `pontosHoje` | Int | 0 | Pontos do dia |
| `pontosSemana` | Int | 0 | Pontos da semana |
| `pontosMes` | Int | 0 | Pontos do mês |
| `nivel` | String | "Prospectador Iniciante" | Nível atual |
| `conquistas` | String[] | [] | Lista de conquistas |
| `progressoDiario` | Int | 0 | Progresso do dia |

**Relações:**
- `user` → User
- `missoesDiarias` → MissaoDiaria[]

**Níveis disponíveis:**
1. Prospectador Iniciante (0-50 pontos)
2. Persistente (51-150 pontos)
3. Consistente (151-300 pontos)
4. Cadência Master (301-599 pontos)
5. Closer (600+ pontos)

### MissaoDiaria

Missões diárias para gamificação.

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | String | cuid() | ID único |
| `gamificacaoId` | String | - | FK para Gamificacao |
| `descricao` | String | - | Descrição da missão |
| `meta` | Int | - | Meta numérica |
| `progresso` | Int | 0 | Progresso atual |
| `concluida` | Boolean | false | Se foi concluída |
| `pontos` | Int | - | Pontos ao completar |

**Missões padrão:**
- "Falar com 5 leads" (meta: 5, pontos: 5)
- "Esquentar 2 leads" (meta: 2, pontos: 5)
- "Resolver todos atrasados" (meta: 1, pontos: 10)

### MetricasDiarias

Métricas de performance por dia.

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | String | cuid() | ID único |
| `userId` | String | - | FK para User |
| `data` | DateTime | now() | Data das métricas |
| `contatosFeitos` | Int | 0 | Contatos realizados |
| `atrasosResolvidos` | Int | 0 | Atrasos resolvidos |
| `novosLeads` | Int | 0 | Novos leads cadastrados |
| `leadsQuentesTrabalhados` | Int | 0 | Leads quentes trabalhados |
| `taxaRitmo` | Float | 0 | Taxa de ritmo |

**Índices:** `[userId, data]` (único), `[userId]`, `[data]`

---

## Roadmap: Volume Financeiro

Campos sugeridos para implementação futura (não implementado):

```prisma
// Em Lead:
valorEstimadoCents    Int?    // Valor estimado em centavos
valorInformadoCents   Int?    // Valor informado em centavos
moeda                 String  @default("BRL")
probabilidade         Int     @default(50) // 0-100%
```

> **Decisão arquitetural:** Valores em centavos evitam problemas de ponto flutuante. Ver `docs/adr/0002-volume-financeiro-centavos.md`.
