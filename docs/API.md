# Backend — API

Base URL (local): `http://localhost:3333`

## Resumo de Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | Pública | Health check |
| ALL | `/api/auth/*` | Pública | Autenticação (Better Auth) |
| GET | `/api/leads` | Requer sessão | Listar leads do usuário |
| GET | `/api/leads/:id` | Requer sessão | Buscar lead por ID |
| POST | `/api/leads` | Requer sessão | Criar novo lead |
| PUT | `/api/leads/:id` | Requer sessão | Atualizar lead |
| DELETE | `/api/leads/:id` | Requer sessão | Deletar lead |
| POST | `/api/leads/:id/contato` | Requer sessão | Registrar contato |
| GET | `/api/gamificacao` | Requer sessão | Buscar/criar gamificação |
| PUT | `/api/gamificacao` | Requer sessão | Atualizar gamificação |
| POST | `/api/gamificacao/pontos` | Requer sessão | Adicionar pontos |
| PUT | `/api/gamificacao/missoes/:id` | Requer sessão | Completar missão |
| GET | `/api/metricas` | Requer sessão | Buscar métricas do dia |
| PUT | `/api/metricas` | Requer sessão | Atualizar métricas |
| POST | `/api/briefings` | Requer sessão | Criar briefing |
| GET | `/api/briefings/lead/:leadId` | Requer sessão | Listar briefings do lead |

---

## Health Check

### GET /health

Verifica se o servidor está online.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Auth (Better Auth)

Rotas gerenciadas pelo Better Auth em `/api/auth/*`.

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/auth/sign-up/email` | Cadastro com email/senha |
| POST | `/api/auth/sign-in/email` | Login com email/senha |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/get-session` | Verificar sessão atual |

> Sessão via cookie. Frontend deve usar `credentials: "include"`.

---

## Leads

Todas as rotas requerem autenticação via sessão.

### GET /api/leads

Lista todos os leads do usuário autenticado.

**Resposta:** Array de leads com histórico e briefings inclusos.

### GET /api/leads/:id

Busca lead específico por ID.

**Parâmetros:**
- `id` (path) - ID do lead

**Resposta:** Objeto lead com histórico e briefings.

### POST /api/leads

Cria novo lead.

**Body:**
```json
{
  "nome": "string",
  "cidade": "string",
  "origem": "Instagram|Indicacao|Anuncio|Evento|WhatsApp|Organico|LinkedIn|Site|Outro",
  "telefone": "string",
  "codigo": "string (opcional)",
  "cadencia": "Semanal|Quinzenal|Mensal",
  "temperatura": "Frio|Morno|Quente",
  "observacao": "string (opcional)",
  "ultimoContato": "ISO date (opcional)",
  "dataEntrada": "ISO date (opcional)"
}
```

**Resposta:** Lead criado (201).

### PUT /api/leads/:id

Atualiza lead existente.

**Parâmetros:**
- `id` (path) - ID do lead

**Body:** Campos a atualizar (parcial permitido).

**Resposta:** Lead atualizado.

### DELETE /api/leads/:id

Deleta lead.

**Parâmetros:**
- `id` (path) - ID do lead

**Resposta:** 204 No Content.

### POST /api/leads/:id/contato

Registra um novo contato com o lead. Atualiza automaticamente:
- `ultimoContato` para data atual
- `proximoContato` baseado na cadência
- `status` e `prioridade` recalculados

**Parâmetros:**
- `id` (path) - ID do lead

**Body:**
```json
{
  "briefing": {
    "tipoContato": "Ligacao|WhatsApp|Email|Reuniao|Visita|Outro",
    "conversa": "string",
    "proximoPasso": "string (opcional)"
  }
}
```

**Resposta:** Lead atualizado com novo histórico.

### Normalização de Enums

O backend normaliza valores entre banco e frontend:

| Campo | Backend | Frontend |
|-------|---------|----------|
| status | `FalarHoje` | `Falar Hoje` |
| status | `EmDia` | `Em Dia` |
| origem | `Indicacao` | `Indicação` |
| origem | `Anuncio` | `Anúncio` |
| origem | `Organico` | `Orgânico` |

---

## Gamificação

Sistema de pontos, níveis e missões diárias.

### GET /api/gamificacao

Busca gamificação do usuário. Cria automaticamente se não existir.

**Resposta:**
```json
{
  "id": "string",
  "userId": "string",
  "pontosHoje": 0,
  "pontosSemana": 0,
  "pontosMes": 0,
  "nivel": "Prospectador Iniciante|Persistente|Consistente|Cadência Master|Closer",
  "conquistas": [],
  "progressoDiario": 0,
  "missoesDiarias": [
    {
      "id": "string",
      "descricao": "Falar com 5 leads",
      "meta": 5,
      "progresso": 0,
      "concluida": false,
      "pontos": 5
    }
  ]
}
```

### PUT /api/gamificacao

Atualiza dados de gamificação.

**Body:** Campos a atualizar.

**Resposta:** Gamificação atualizada.

### POST /api/gamificacao/pontos

Adiciona pontos ao usuário.

**Body:**
```json
{
  "pontos": 10
}
```

**Resposta:** Gamificação atualizada.

> **Atenção:** Endpoint permite adicionar pontos via client. Roadmap: mover lógica para servidor.

### PUT /api/gamificacao/missoes/:id

Marca missão como concluída. Adiciona pontos da missão + bônus de 20 se todas concluídas.

**Parâmetros:**
- `id` (path) - ID da missão

**Resposta:** Gamificação atualizada.

---

## Métricas Diárias

Acompanhamento de performance por dia.

### GET /api/metricas

Busca métricas do dia atual. Cria automaticamente se não existir.

**Resposta:**
```json
{
  "id": "string",
  "userId": "string",
  "data": "ISO date",
  "contatosFeitos": 0,
  "atrasosResolvidos": 0,
  "novosLeads": 0,
  "leadsQuentesTrabalhados": 0,
  "taxaRitmo": 0
}
```

### PUT /api/metricas

Atualiza métricas do dia.

**Body:** Campos a atualizar.

**Resposta:** Métricas atualizadas.

---

## Briefings

Documentação detalhada de conversas com leads.

### POST /api/briefings

Cria briefing e registra no histórico do lead.

**Body:**
```json
{
  "leadId": "string",
  "tipoContato": "Ligacao|WhatsApp|Email|Reuniao|Visita|Outro",
  "objetivo": "string (opcional)",
  "conversa": "string (opcional)",
  "resultado": "string (opcional)",
  "interesseDemonstrado": "string (opcional)",
  "objecoes": "string (opcional)",
  "proximoPasso": "string (opcional)",
  "proximoFollowUp": "ISO date (opcional)",
  "temperaturaAtualizada": "Frio|Morno|Quente"
}
```

**Resposta:** Briefing criado (201).

> **Atenção:** Valida ownership do lead antes de criar histórico, mas cria briefing antes da validação.

### GET /api/briefings/lead/:leadId

Lista todos os briefings de um lead.

**Parâmetros:**
- `leadId` (path) - ID do lead

**Resposta:** Array de briefings ordenados por data (desc).

---

## Autenticação

Todas as rotas exceto `/health` e `/api/auth/*` requerem sessão ativa.

**Headers necessários:**
- Cookie de sessão (automático via `credentials: "include"`)

**Resposta de erro (401):**
```json
{
  "error": "Not authenticated"
}
```

## Erros Comuns

| Status | Significado |
|--------|-------------|
| 400 | Bad Request - dados inválidos |
| 401 | Não autenticado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |
