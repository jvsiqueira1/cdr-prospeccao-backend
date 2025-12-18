import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import prisma from "./lib/prisma.js";
import { auth } from "./auth.js";
import leadsRoutes from "./routes/leads.js";
import gamificacaoRoutes from "./routes/gamificacao.js";
import metricasRoutes from "./routes/metricas.js";
import briefingsRoutes from "./routes/briefings.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// Configurar origens permitidas para CORS
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:8080'];

// Middleware CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origem (ex: mobile apps, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Better Auth handler
app.all("/api/auth/*", async (req, res) => {
  try {
    // Detectar protocolo correto em produção (via proxy reverso do Render)
    const protocol = req.get("x-forwarded-proto") || req.protocol || (req.secure ? "https" : "http");
    const host = req.get("host") || `localhost:${PORT}`;
    const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

    // Modifica o req para ter a URL completa
    req.url = fullUrl;
    req.originalUrl = fullUrl;

    // Converte o req do Express para um Request do Fetch API
    const body =
      req.method !== "GET" && req.method !== "HEAD" && req.body
        ? JSON.stringify(req.body)
        : undefined;

    // Normalizar headers e garantir Cookie está presente
    const headers = new Headers();
    Object.keys(req.headers).forEach((key) => {
      const value = req.headers[key];
      if (value) {
        const normalizedKey = key.toLowerCase(); // Normalizar para lowercase (importante para Fetch API)
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(normalizedKey, v));
        } else {
          headers.set(normalizedKey, value);
        }
      }
    });

    // Garantir cookie está presente (caso não tenha sido capturado)
    if (req.headers.cookie && !headers.has("cookie")) {
      headers.set("cookie", req.headers.cookie);
    }

    // Logs de debug (apenas em development ou via env var)
    const DEBUG_AUTH = process.env.DEBUG_AUTH === "true" || process.env.NODE_ENV === "development";
    if (DEBUG_AUTH && req.path === "/api/auth/get-session") {
      console.log("=== AUTH DEBUG ===");
      console.log("Cookies recebidos:", req.headers.cookie || "Nenhum cookie");
      console.log("Origin:", req.headers.origin);
      console.log("Full URL:", fullUrl);
      console.log("Protocol:", protocol);
      console.log("Headers enviados para Better Auth:", Object.fromEntries(headers));
    }

    const fetchRequest = new Request(fullUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    // Chama o handler do Better Auth
    const response = await auth.handler(fetchRequest);

    // Converte a resposta do Fetch para Express
    const responseBody = await response.text();

    // Copia os headers da resposta
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Garantir que headers CORS estão presentes na resposta
    if (!res.getHeader("Access-Control-Allow-Credentials")) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (req.headers.origin && allowedOrigins.includes(req.headers.origin)) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    }

    // Log de debug da resposta
    if (DEBUG_AUTH && req.path === "/api/auth/get-session") {
      console.log("Status da resposta:", response.status);
      console.log("Body da resposta:", responseBody.substring(0, 200)); // Primeiros 200 chars
    }

    // Envia o status e o body
    res.status(response.status).send(responseBody);
  } catch (error) {
    console.error("Error in Better Auth handler:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/leads", leadsRoutes);
app.use("/api/gamificacao", gamificacaoRoutes);
app.use("/api/metricas", metricasRoutes);
app.use("/api/briefings", briefingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
