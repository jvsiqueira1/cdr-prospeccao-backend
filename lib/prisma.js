import { PrismaClient } from "@prisma/client";

// Configuração do Prisma Client para ambientes serverless/hibernados
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Códigos de erro do Prisma relacionados a conexão fechada
const CONNECTION_ERROR_CODES = ["P1001", "P1017", "P1008"];
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 100; // ms

/**
 * Verifica se o erro é relacionado a conexão fechada
 * @param {Error} error
 * @returns {boolean}
 */
const isConnectionError = (error) => {
  if (!error) return false;

  // Verifica códigos de erro do Prisma
  if (error.code && CONNECTION_ERROR_CODES.includes(error.code)) {
    return true;
  }

  // Verifica mensagens de erro relacionadas a conexão fechada
  const errorMessage = error.message?.toLowerCase() || "";
  const connectionErrorMessages = [
    "connection closed",
    "connection is closed",
    "server closed the connection",
    "connection terminated",
    "broken pipe",
    "connection reset",
    "kind: closed",
  ];

  return connectionErrorMessages.some((msg) => errorMessage.includes(msg));
};

/**
 * Aguarda um tempo antes de tentar novamente (backoff exponencial)
 * @param {number} attempt
 * @returns {Promise<void>}
 */
const wait = (attempt) => {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Tenta reconectar ao banco de dados
 * @returns {Promise<void>}
 */
const reconnect = async () => {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
  } catch (error) {
    console.error("Erro ao reconectar ao banco de dados:", error);
    throw error;
  }
};

/**
 * Executa uma operação do Prisma com retry automático em caso de erro de conexão
 * @param {Function} operation - Função que executa a operação do Prisma
 * @param {number} retries - Número de tentativas restantes
 * @returns {Promise<any>}
 */
const executeWithRetry = async (operation, retries = MAX_RETRIES) => {
  try {
    return await operation();
  } catch (error) {
    // Se não é erro de conexão ou não há mais tentativas, propaga o erro
    if (!isConnectionError(error) || retries <= 0) {
      throw error;
    }

    // Log do erro de conexão
    const errorCode = error.code || "UNKNOWN";
    console.warn(
      `Erro de conexão detectado (${errorCode}). Tentando reconectar... (${
        MAX_RETRIES - retries + 1
      }/${MAX_RETRIES})`
    );

    // Tenta reconectar
    try {
      await reconnect();
    } catch (reconnectError) {
      // Se falhou ao reconectar e ainda há tentativas, aguarda e tenta novamente
      if (retries > 1) {
        await wait(MAX_RETRIES - retries);
        return executeWithRetry(operation, retries - 1);
      }
      throw reconnectError;
    }

    // Aguarda um pouco antes de tentar novamente
    await wait(MAX_RETRIES - retries);

    // Tenta executar a operação novamente
    return executeWithRetry(operation, retries - 1);
  }
};

/**
 * Wrapper para modelos do Prisma que adiciona retry automático
 */
const createModelProxy = (model) => {
  return new Proxy(model, {
    get(target, prop) {
      const original = target[prop];

      // Se não é uma função, retorna o valor original
      if (typeof original !== "function") {
        return original;
      }

      // Retorna uma função que executa com retry
      return function (...args) {
        return executeWithRetry(() => original.apply(target, args));
      };
    },
  });
};

// Criar um proxy que intercepta todas as propriedades e métodos
const prismaWithRetry = new Proxy(prisma, {
  get(target, prop) {
    const original = target[prop];

    // Se é um modelo do Prisma, criar proxy com retry
    if (
      prop === "lead" ||
      prop === "user" ||
      prop === "gamificacao" ||
      prop === "metricasDiarias" ||
      prop === "historicoContato" ||
      prop === "briefing" ||
      prop === "missaoDiaria" ||
      prop === "session" ||
      prop === "account" ||
      prop === "verification"
    ) {
      return createModelProxy(original);
    }

    // Métodos do Prisma Client que precisam de retry
    if (
      prop === "$transaction" ||
      prop === "$queryRaw" ||
      prop === "$executeRaw" ||
      prop === "$queryRawUnsafe" ||
      prop === "$executeRawUnsafe"
    ) {
      return async (...args) => {
        return executeWithRetry(() => original.apply(target, args));
      };
    }

    // Outros métodos e propriedades são retornados normalmente
    return original;
  },
});

export default prismaWithRetry;
