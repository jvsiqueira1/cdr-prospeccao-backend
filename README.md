# Backend CRM API

Backend em Express.js com Prisma 6, PostgreSQL (Neon) e Better Auth para o sistema CRM.

## 🚀 Início Rápido

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Server
PORT=3333
NODE_ENV=development
FRONTEND_URL=http://localhost:8080

# Better Auth
BETTER_AUTH_SECRET="sua-chave-secreta-longa-e-aleatoria-aqui"
BETTER_AUTH_URL="http://localhost:3333"
BETTER_AUTH_BASE_URL="http://localhost:3333"
```

> **Nota**: Para produção, use URLs HTTPS e uma chave secreta forte gerada aleatoriamente.

### 3. Configurar Prisma

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrações (desenvolvimento)
npm run prisma:migrate

# Aplicar migrações (produção)
npm run prisma:deploy
```

### 4. Executar servidor

```bash
# Desenvolvimento (com watch)
npm run dev

# Produção
npm start
```

## 📦 Deploy na Render

O projeto inclui um arquivo `render.yaml` para deploy automático. Configure:

1. **Conecte seu repositório** na Render
2. **Variáveis de ambiente** (via Render Dashboard):
   - `DATABASE_URL`: URL do banco Neon
   - `PORT`: 3333 (ou deixe vazio)
   - `NODE_ENV`: production
   - `FRONTEND_URL`: URL do seu frontend (ex: `https://seu-frontend.vercel.app`)
   - `BETTER_AUTH_SECRET`: Chave secreta forte (gere uma nova para produção!)
   - `BETTER_AUTH_URL`: URL do backend (ex: `https://seu-backend.onrender.com`)
   - `BETTER_AUTH_BASE_URL`: Mesma que `BETTER_AUTH_URL`

3. **Build Command**: `npm install && npm run prisma:generate && npm run prisma:deploy`
4. **Start Command**: `npm start`

Ou use o `render.yaml` que já está configurado.

## 📚 Endpoints da API

**Todas as rotas (exceto `/health` e `/api/auth/*`) requerem autenticação via Better Auth.**

### Autenticação (Better Auth)
- `POST /api/auth/sign-up/email` - Registrar novo usuário
- `POST /api/auth/sign-in/email` - Fazer login
- `POST /api/auth/sign-out` - Fazer logout
- `GET /api/auth/get-session` - Obter sessão atual

### Leads
- `GET /api/leads` - Listar todos os leads do usuário autenticado
- `GET /api/leads/:id` - Buscar lead por ID (do usuário autenticado)
- `POST /api/leads` - Criar novo lead
- `PUT /api/leads/:id` - Atualizar lead
- `DELETE /api/leads/:id` - Deletar lead
- `POST /api/leads/:id/contato` - Registrar contato

### Gamificação
- `GET /api/gamificacao` - Buscar gamificação do usuário autenticado
- `PUT /api/gamificacao` - Atualizar gamificação
- `POST /api/gamificacao/pontos` - Adicionar pontos
- `PUT /api/gamificacao/missoes/:id` - Completar missão

### Métricas
- `GET /api/metricas` - Buscar métricas do dia (do usuário autenticado)
- `PUT /api/metricas` - Atualizar métricas

### Briefings
- `POST /api/briefings` - Criar briefing
- `GET /api/briefings/lead/:leadId` - Buscar briefings de um lead

### Health Check
- `GET /health` - Verificar status do servidor (público)

## 🔒 Autenticação

Este backend usa [Better Auth](https://better-auth.com) para autenticação. Cada usuário tem seus próprios dados isolados. Todas as rotas de API (exceto `/health` e `/api/auth/*`) requerem autenticação via cookie de sessão.

## 📝 Estrutura do Projeto

```
.
├── auth.js              # Configuração do Better Auth
├── server.js            # Servidor Express principal
├── lib/
│   └── prisma.js        # Cliente Prisma
├── middleware/
│   └── auth.js          # Middleware de autenticação
├── routes/              # Rotas da API
│   ├── leads.js
│   ├── gamificacao.js
│   ├── metricas.js
│   └── briefings.js
├── prisma/
│   ├── schema.prisma    # Schema do banco de dados
│   └── migrations/      # Migrações do Prisma
├── render.yaml          # Configuração para deploy no Render
└── package.json
```

## 🔗 Links Úteis

- [Documentação do Better Auth](https://better-auth.com/docs)
- [Documentação do Prisma](https://www.prisma.io/docs)
- [Documentação do Express](https://expressjs.com/)

