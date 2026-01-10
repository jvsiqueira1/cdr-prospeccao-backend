import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./lib/prisma.js";

// Configurar origens confiáveis
const trustedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173"];

// Determinar se está em produção (HTTPS) - detecção mais robusta
const baseURL = process.env.BETTER_AUTH_BASE_URL || process.env.BETTER_AUTH_URL || "";
const isHTTPS = baseURL.startsWith("https") || baseURL.includes("https://");
const isProduction = process.env.NODE_ENV === "production" || isHTTPS;

// Verificar se frontend e backend estão em domínios diferentes (cross-origin)
const frontendUrls = trustedOrigins;
const backendUrl = baseURL ? baseURL.replace(/\/api\/auth$/, "") : "";
let isCrossOrigin = false;

if (backendUrl && frontendUrls.length > 0) {
  try {
    isCrossOrigin = frontendUrls.some((frontendUrl) => {
      if (!frontendUrl) return false;
      try {
        const frontendOrigin = new URL(frontendUrl).origin;
        const backendOrigin = new URL(backendUrl).origin;
        return frontendOrigin !== backendOrigin;
      } catch {
        return false;
      }
    });
  } catch {
    // Se houver erro ao comparar URLs, assume same-origin
    isCrossOrigin = false;
  }
}

// Para Safari iOS, cookies cross-origin precisam de SameSite=None e Secure=true
// Se for cross-origin, forçar SameSite=None mesmo em desenvolvimento HTTPS
const sameSite = isProduction || isCrossOrigin ? "None" : "Lax";
// Secure=true é obrigatório quando SameSite=None (especialmente no Safari)
const secure = sameSite === "None" ? true : isProduction;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: baseURL,
  basePath: "/api/auth",
  trustedOrigins: trustedOrigins,
  advanced: {
    defaultCookieAttributes: {
      // Safari iOS requer SameSite=None; Secure para cookies cross-origin
      sameSite: sameSite,
      secure: secure, // Secure=true obrigatório quando SameSite=None
      // Não definir domain explicitamente - deixa o browser decidir
      // path padrão "/" está correto para cookies de autenticação
    },
  },
});

export default auth;
