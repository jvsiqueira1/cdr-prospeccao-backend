# Backend — Deploy (Render)

Arquivo: `render.yaml`

Build:

- `npm install --legacy-peer-deps`
- `npm run prisma:generate`
- `npm run prisma:deploy`

Start:

- `npm start`

Variáveis esperadas no Render:

- `NODE_ENV=production`
- `DATABASE_URL`
- `FRONTEND_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_BASE_URL`
