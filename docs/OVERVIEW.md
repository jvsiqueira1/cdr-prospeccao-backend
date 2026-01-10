# Backend — Overview

Backend em **Node.js** para o sistema CRM de prospecção de vendas ("Prospecção Fantástica").

## Stack Tecnológica

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| Node.js | 18+ | Runtime JavaScript |
| Express.js | 4.21.1 | Framework web para REST API |
| Prisma | 6.0.0 | ORM para PostgreSQL |
| PostgreSQL | - | Banco de dados relacional |
| Better Auth | 1.4.7 | Autenticação e sessão |
| date-fns | 3.6.0 | Manipulação de datas |
| cors | 2.8.5 | Middleware para CORS |
| cookie-parser | 1.4.7 | Parser de cookies |
| dotenv | 16.4.5 | Gerenciamento de variáveis de ambiente |

## Estrutura do Projeto

```
prospec-o-fan-tica-backend/
├── server.js                 # App Express e configuração de middlewares
├── auth.js                   # Configuração do Better Auth
├── package.json              # Dependências e scripts
├── render.yaml               # Configuração de deploy no Render.com
├── .env.example              # Template de variáveis de ambiente
│
├── lib/
│   └── prisma.js             # Prisma Client com retry para serverless
│
├── middleware/
│   └── auth.js               # Middleware de autenticação (requireAuth)
│
├── routes/
│   ├── leads.js              # Endpoints de leads
│   ├── gamificacao.js        # Endpoints de gamificação
│   ├── metricas.js           # Endpoints de métricas
│   └── briefings.js          # Endpoints de briefings
│
├── prisma/
│   ├── schema.prisma         # Definição do schema do banco
│   └── migrations/           # Arquivos de migração
│
└── docs/                     # Documentação
```

## Responsabilidades

- **Autenticação e sessão** (Better Auth) em `/api/auth/*`
- **CRUD de Leads** em `/api/leads`
- **Registro de contato** (histórico + status/prioridade) em `/api/leads/:id/contato`
- **Gamificação** em `/api/gamificacao`
- **Métricas diárias** em `/api/metricas`
- **Briefings** em `/api/briefings`

## Features Principais

1. **Gestão de Leads**: CRUD completo com informações de contato, status e temperatura
2. **Histórico de Contatos**: Registro de todas as interações com leads
3. **Cálculo Automático de Status**: Status baseado em cadência e datas de contato
4. **Sistema de Gamificação**: Pontos, níveis e missões diárias
5. **Métricas Diárias**: Acompanhamento de performance de vendas
6. **Briefings**: Documentação detalhada de conversas

## Pontos de Atenção (Estado Atual)

- **/api/leads** retorna muita informação (leads + histórico + briefings). Pode ficar pesado com escala.
- **Gamificação** permite adicionar pontos via endpoint; ideal evoluir para regras no servidor (anti-fraude).
- **Briefings (POST)** precisa validar ownership do `leadId` para evitar acesso indevido.
- `.gitignore` ignora `prisma/migrations/` — isso dificulta reproduzir banco. Ideal versionar migrations.

## Documentação Relacionada

- [LOCAL_DEV.md](./LOCAL_DEV.md) — Guia de desenvolvimento local
- [API.md](./API.md) — Documentação da API
- [DATA_MODEL.md](./DATA_MODEL.md) — Modelo de dados
- [SECURITY.md](./SECURITY.md) — Considerações de segurança
- [DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md) — Deploy no Render.com

## Roadmap (Alto Nível)

1. Volume financeiro por lead (valor estimado/informado)
2. Gamificação 2.0 (ledger de eventos + regras no servidor + XP vs Rank Points)
3. Dashboard de líder (RBAC e agregações por time)
4. Segurança (validação Zod, whitelists, criptografia de campos sensíveis)
