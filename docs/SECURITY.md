# Backend — Security

Documentacao de riscos de seguranca identificados no codigo atual e recomendacoes de correcao.

---

## Resumo de Vulnerabilidades

| Severidade | Vulnerabilidade | Arquivo |
|------------|----------------|---------|
| Critica | Briefing IDOR | routes/briefings.js:15-40 |
| Critica | Mass Assignment | routes/leads.js, gamificacao.js, metricas.js |
| Critica | Client-Controlled Points | routes/gamificacao.js:135-177 |
| Alta | Sem Validacao de Input | Todas as rotas |
| Alta | Sem Rate Limiting | server.js |
| Media | Sem Security Headers | server.js |
| Media | Dados Sensiveis em Texto Plano | Prisma schema |
| Media | Payload Size Ilimitado | server.js:37 |
| Baixa | Exposicao de Debug Info | server.js:77,144 |
| Baixa | Gestao de Segredos | .env |

---

## Vulnerabilidades Criticas

### 1. Briefing IDOR (Insecure Direct Object Reference)

**Arquivo:** `routes/briefings.js:15-40`

**Problema:** O briefing e criado ANTES de validar se o lead pertence ao usuario.

```javascript
// Linha 15-28: Cria o briefing primeiro
const briefing = await prisma.briefing.create({
  data: { leadId: briefingData.leadId, ... }
});

// Linha 31-40: So depois valida ownership
const lead = await prisma.lead.findFirst({
  where: { id: briefingData.leadId, userId: req.userId }
});

if (!lead) {
  return res.status(404).json({ error: 'Lead not found' });
  // Briefing ja foi criado no banco!
}
```

**Impacto:** Atacante pode criar briefings em leads de outros usuarios.

**Correcao Recomendada:**
```javascript
// Validar ANTES de criar
const lead = await prisma.lead.findFirst({
  where: { id: briefingData.leadId, userId: req.userId }
});

if (!lead) {
  return res.status(404).json({ error: 'Lead not found' });
}

// So criar apos validacao
const briefing = await prisma.briefing.create({ ... });
```

---

### 2. Mass Assignment

**Arquivos:**
- `routes/leads.js:333` - `data: updates`
- `routes/gamificacao.js:119` - `data: updates`
- `routes/metricas.js:60,68` - `...req.body` / `data: req.body`

**Problema:** O `req.body` e passado diretamente para o Prisma, permitindo que o cliente modifique qualquer campo.

```javascript
// routes/leads.js:333
const leadAtualizado = await prisma.lead.update({
  where: { id: req.params.id, userId: req.userId },
  data: updates,  // <-- req.body inteiro!
});

// routes/metricas.js:68
metricas = await prisma.metricasDiarias.update({
  where: { id: metricas.id },
  data: req.body  // <-- req.body inteiro!
});
```

**Impacto:** Cliente pode modificar campos que nao deveria (ex: `userId`, `createdAt`, `id`).

**Correcao Recomendada:**
```javascript
// Whitelist de campos permitidos
const allowedFields = ['nome', 'cidade', 'temperatura', 'observacao'];
const updates = {};
for (const field of allowedFields) {
  if (req.body[field] !== undefined) {
    updates[field] = req.body[field];
  }
}

// Ou usar Zod para validacao
const UpdateLeadSchema = z.object({
  nome: z.string().optional(),
  cidade: z.string().optional(),
  // ... apenas campos permitidos
});
const updates = UpdateLeadSchema.parse(req.body);
```

---

### 3. Client-Controlled Points (Gamification Fraud)

**Arquivo:** `routes/gamificacao.js:135-177`

**Problema:** O endpoint `POST /api/gamificacao/pontos` aceita qualquer valor de pontos do cliente.

```javascript
// Linha 137
const { pontos } = req.body;  // Nenhuma validacao!

// Linha 157-164
const gamificacaoAtualizada = await prisma.gamificacao.update({
  data: {
    pontosHoje: gamificacao.pontosHoje + pontos,  // pontos pode ser 999999
    pontosSemana: gamificacao.pontosSemana + pontos,
    pontosMes: gamificacao.pontosMes + pontos,
  }
});
```

**Impacto:**
- Usuario pode adicionar pontos infinitos
- Pode enviar valores negativos para reduzir pontos
- Bypass completo do sistema de gamificacao

**Correcao Recomendada:**
```javascript
// Opcao 1: Remover endpoint e calcular pontos no servidor
// Mover logica para quando acoes sao realizadas (ex: registrar contato)

// Opcao 2: Se manter endpoint, validar rigidamente
const MAX_POINTS_PER_ACTION = 20;
const pontos = Math.min(Math.max(0, req.body.pontos), MAX_POINTS_PER_ACTION);

// Opcao 3: Event sourcing (ledger)
// Registrar eventos (lead_contacted, mission_completed) e calcular pontos
```

---

## Vulnerabilidades de Alta Severidade

### 4. Sem Validacao de Input

**Arquivos:** Todas as rotas

**Problema:** Nenhuma validacao de tipos, formatos ou enums nos dados de entrada.

```javascript
// routes/leads.js - POST /api/leads
const leadData = req.body;
// Nao valida se 'origem' e um enum valido
// Nao valida se 'cadencia' e Semanal/Quinzenal/Mensal
// Nao valida tipos (nome pode ser numero, etc)
```

**Impacto:**
- Dados invalidos no banco
- Erros de runtime
- Possivel injection em campos de texto

**Correcao Recomendada:**
```javascript
import { z } from 'zod';

const CreateLeadSchema = z.object({
  nome: z.string().min(1).max(200),
  cidade: z.string().min(1).max(100),
  origem: z.enum(['Instagram', 'Indicacao', 'Anuncio', ...]),
  cadencia: z.enum(['Semanal', 'Quinzenal', 'Mensal']),
  telefone: z.string().regex(/^\+?[\d\s-]+$/),
  temperatura: z.enum(['Frio', 'Morno', 'Quente']).optional(),
});

router.post('/', async (req, res, next) => {
  const result = CreateLeadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }
  const leadData = result.data;
  // ...
});
```

---

### 5. Sem Rate Limiting

**Arquivo:** `server.js`

**Problema:** Nenhuma limitacao de requisicoes por IP ou usuario.

**Impacto:**
- Brute force no login (`/api/auth/sign-in/email`)
- DoS por excesso de requisicoes
- Abuso de API (scraping, spam)

**Correcao Recomendada:**
```javascript
import rateLimit from 'express-rate-limit';

// Limite global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: { error: 'Too many requests' }
});

// Limite especifico para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentativas de login
  message: { error: 'Too many login attempts' }
});

app.use(globalLimiter);
app.use('/api/auth/sign-in', authLimiter);
```

---

## Vulnerabilidades de Media Severidade

### 6. Sem Security Headers

**Arquivo:** `server.js`

**Problema:** Headers de seguranca HTTP nao configurados.

**Impacto:**
- Vulneravel a clickjacking (sem X-Frame-Options)
- Vulneravel a XSS (sem Content-Security-Policy)
- Informacoes do servidor expostas (sem X-Powered-By removal)

**Correcao Recomendada:**
```javascript
import helmet from 'helmet';

app.use(helmet());
// Ou configurar individualmente:
app.use(helmet.contentSecurityPolicy());
app.use(helmet.xFrameOptions({ action: 'deny' }));
app.use(helmet.noSniff());
app.use(helmet.hidePoweredBy());
```

---

### 7. Dados Sensiveis em Texto Plano

**Arquivos:** `prisma/schema.prisma`, todas as rotas

**Campos afetados:**
- `Lead.telefone`
- `Lead.observacao`
- `HistoricoContato.resumo`
- `Briefing.conversa`, `Briefing.objecoes`, etc.

**Impacto:** Se o banco for comprometido, dados de clientes ficam expostos.

**Correcao Recomendada:**
```javascript
// Criptografia em nivel de aplicacao
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Para busca por telefone, usar hash separado
const telefoneHash = crypto.createHash('sha256').update(telefone).digest('hex');
```

---

### 8. Payload Size Ilimitado

**Arquivo:** `server.js:37`

```javascript
app.use(express.json());  // Sem limite de tamanho
```

**Impacto:** Atacante pode enviar payloads enormes para causar DoS.

**Correcao Recomendada:**
```javascript
app.use(express.json({ limit: '100kb' }));
```

---

## Vulnerabilidades de Baixa Severidade

### 9. Exposicao de Debug Info

**Arquivo:** `server.js:77,144`

```javascript
// Linha 77-85: Logs de debug em development
if (DEBUG_AUTH && req.path === "/api/auth/get-session") {
  console.log("Cookies recebidos:", req.headers.cookie);  // Expoe cookies!
}

// Linha 144: Stack trace em erros
res.status(err.status || 500).json({
  error: err.message,
  ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
});
```

**Impacto:** Logs podem vazar informacoes sensiveis. Stack traces podem revelar estrutura interna.

**Correcao Recomendada:**
```javascript
// Usar logger estruturado que mascara dados sensiveis
import pino from 'pino';

const logger = pino({
  redact: ['req.headers.cookie', 'req.headers.authorization']
});

// Nunca logar cookies ou tokens
if (DEBUG_AUTH) {
  logger.debug({ path: req.path, hasSession: !!sessionData });
}

// Nunca expor stack traces, mesmo em development
res.status(err.status || 500).json({
  error: process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message
});
```

---

### 10. Gestao de Segredos

**Arquivo:** `.env`

**Boas praticas atuais:**
- `.env` nao e versionado (bom)

**Riscos:**
- `BETTER_AUTH_SECRET` fraco
- Segredos nao rotacionados

**Correcao Recomendada:**
```bash
# Gerar segredo forte
openssl rand -base64 32

# Verificar se .env foi commitado acidentalmente
git log --all --full-history -- .env

# Se foi, rotacionar TODOS os segredos imediatamente
```

---

## Checklist de Seguranca

### Implementacao Imediata (P0)
- [ ] Corrigir IDOR no briefings.js (validar ownership antes de criar)
- [ ] Adicionar whitelist de campos em todos os PUT endpoints
- [ ] Remover ou proteger endpoint de pontos

### Curto Prazo (P1)
- [ ] Adicionar validacao Zod em todas as rotas
- [ ] Implementar rate limiting (express-rate-limit)
- [ ] Adicionar Helmet para security headers
- [ ] Limitar tamanho de payload

### Medio Prazo (P2)
- [ ] Implementar criptografia para dados sensiveis
- [ ] Configurar logging estruturado sem dados sensiveis
- [ ] Implementar RBAC (Seller/Leader/Admin)
- [ ] Adicionar audit log para acoes criticas

### Longo Prazo (P3)
- [ ] Migrar gamificacao para event sourcing (ledger)
- [ ] Implementar rotacao automatica de segredos
- [ ] Adicionar WAF (Web Application Firewall)
- [ ] Penetration testing

---

## Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js](https://helmetjs.github.io/)
- [Zod](https://zod.dev/)
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit)
