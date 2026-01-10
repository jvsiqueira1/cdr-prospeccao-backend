# Workspace (Frontend + Backend)

Este repositório é o **backend** do projeto "CDR de prospecção".

O frontend está em outro repositório/pasta: `prospec-o-fan-tica/`.

## Rodando local (stack completa)

1. Suba o backend:

- `npm install`
- configure `.env` (use `.env.example` como base)
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run dev`
- Backend em: `http://localhost:3333`

2. Suba o frontend:

- no repo do frontend, configure `.env` com `VITE_API_URL=http://localhost:3333/api` e `VITE_BETTER_AUTH_URL=http://localhost:3333/api/auth`
- `npm run dev`
- Front em: `http://localhost:5173`

## Convenções importantes

- **Autenticação**: todas as rotas `/api/*` usam sessão via cookie (Better Auth).
- **Autorização**: qualquer recurso com `userId` deve validar ownership (lead/briefings/etc).
- **Gamificação**: pontuação deve ser calculada e registrada no servidor (não confiar no client).
