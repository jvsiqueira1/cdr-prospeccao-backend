# Backend — Local Dev

Guia para configurar e rodar o backend localmente.

## Pré-requisitos

- **Node.js** 18+ (recomendado: 20 LTS)
- **npm** ou **yarn**
- **PostgreSQL** (local ou serviço como Neon, Supabase)

## Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd prospec-o-fan-tica-backend

# Instale as dependências
npm install
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

### Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string do PostgreSQL | `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` |
| `BETTER_AUTH_SECRET` | Chave secreta para autenticação | Gere com: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL base do backend para auth | `http://localhost:3333` |
| `BETTER_AUTH_BASE_URL` | URL base do backend | `http://localhost:3333` |

### Variáveis Opcionais

| Variável | Descrição | Default |
|----------|-----------|---------|
| `PORT` | Porta do servidor | `3333` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `FRONTEND_URL` | URLs do frontend (CORS) | `http://localhost:5173` |
| `DEBUG_AUTH` | Logs detalhados de autenticação | `false` |

### Exemplo de `.env`

```env
# Database
DATABASE_URL="postgresql://postgres:senha@localhost:5432/prospeccao?sslmode=prefer"

# Server
PORT=3333
NODE_ENV=development

# CORS: lista separada por vírgula
FRONTEND_URL="http://localhost:5173,http://localhost:8080"

# Better Auth
BETTER_AUTH_SECRET="sua-chave-secreta-aqui-gere-com-openssl"
BETTER_AUTH_URL="http://localhost:3333"
BETTER_AUTH_BASE_URL="http://localhost:3333"

# Debug (opcional)
DEBUG_AUTH=true
```

## Setup do Banco de Dados

```bash
# Gera o Prisma Client
npm run prisma:generate

# Cria e aplica migrations (desenvolvimento)
npm run prisma:migrate

# Abre o Prisma Studio para visualizar dados
npm run prisma:studio
```

## Rodando o Servidor

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Modo produção
npm start
```

O servidor estará disponível em `http://localhost:3333`.

## Scripts Disponíveis (package.json)

| Script | Comando | Descrição |
|--------|---------|-----------|
| `npm run dev` | `node --watch server.js` | Desenvolvimento com watch mode |
| `npm start` | `node server.js` | Produção |
| `npm run prisma:generate` | `prisma generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` | Cria/aplica migrations (dev) |
| `npm run prisma:deploy` | `prisma migrate deploy` | Aplica migrations (produção) |
| `npm run prisma:studio` | `prisma studio` | Editor visual do banco |

## Testando a API

### Health Check

```bash
curl http://localhost:3333/health
```

Resposta esperada:
```json
{ "status": "ok" }
```

### Endpoints Principais

| Endpoint | Método | Autenticação | Descrição |
|----------|--------|--------------|-----------|
| `/health` | GET | Pública | Health check |
| `/api/auth/*` | ALL | Pública | Autenticação (Better Auth) |
| `/api/leads` | GET/POST | Requer sessão | Listar/Criar leads |
| `/api/leads/:id` | GET/PUT/DELETE | Requer sessão | CRUD de lead |
| `/api/leads/:id/contato` | POST | Requer sessão | Registrar contato |
| `/api/gamificacao` | GET/PUT | Requer sessão | Gamificação do usuário |
| `/api/metricas` | GET/PUT | Requer sessão | Métricas diárias |
| `/api/briefings` | POST | Requer sessão | Criar briefing |

## CORS

O backend aceita requisições de origens definidas em `FRONTEND_URL`.

```env
# Uma origem
FRONTEND_URL="http://localhost:5173"

# Múltiplas origens (separadas por vírgula)
FRONTEND_URL="http://localhost:5173,http://localhost:8080"
```

## Debug de Autenticação

Para logs detalhados de autenticação:

```env
DEBUG_AUTH=true
```

Isso exibe informações do `get-session` no console.

## Problemas Comuns

### Erro de conexão com banco

```
Error: P1001: Can't reach database server
```

**Solução**: Verifique se o PostgreSQL está rodando e se a `DATABASE_URL` está correta.

### Erro de CORS

```
Access-Control-Allow-Origin header missing
```

**Solução**: Verifique se `FRONTEND_URL` inclui a origem do seu frontend.

### Prisma Client desatualizado

```
PrismaClientInitializationError
```

**Solução**: Execute `npm run prisma:generate` após alterações no schema.

### Porta em uso

```
Error: listen EADDRINUSE :::3333
```

**Solução**: Altere a variável `PORT` ou encerre o processo usando a porta.

## Integração com Frontend

O frontend espera as seguintes variáveis:

```env
VITE_API_URL=http://localhost:3333/api
VITE_BETTER_AUTH_URL=http://localhost:3333/api/auth
```
