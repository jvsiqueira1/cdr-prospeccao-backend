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

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Better Auth handler
app.all("/api/auth/*", async (req, res) => {
  try {
    // Constrói a URL completa para o Better Auth
    // Em produção (Render), o req.get("host") já vem sem porta automaticamente
    // Em desenvolvimento, usa localhost:PORT como fallback
    const protocol = req.protocol || (req.secure ? "https" : "http");
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

    const headers = new Headers();
    Object.keys(req.headers).forEach((key) => {
      const value = req.headers[key];
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    });

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
