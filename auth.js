import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./lib/prisma.js";

// Configurar origens confiáveis
const trustedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ["http://localhost:5173"];

// Determinar se está em produção (HTTPS)
const isProduction = process.env.NODE_ENV === "production" || 
                     (process.env.BETTER_AUTH_BASE_URL && process.env.BETTER_AUTH_BASE_URL.startsWith("https"));

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_BASE_URL || process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: trustedOrigins,
  advanced: {
    defaultCookieAttributes: {
      // Em produção (cross-origin), usar SameSite=None e Secure=true
      // Em desenvolvimento (same-origin), usar SameSite=Lax
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction, // Secure=true apenas em HTTPS (produção)
    },
  },
});

export default auth;

