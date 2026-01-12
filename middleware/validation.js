import { z } from "zod";

// Reusable enum schemas (accept both backend and frontend values)
export const cadenciaSchema = z.enum(["Semanal", "Quinzenal", "Mensal"]);
export const statusSchema = z.enum([
  "Atrasado",
  "FalarHoje",
  "Falar Hoje",
  "EmDia",
  "Em Dia",
  "Convertido",
]);
export const temperaturaSchema = z.enum(["Frio", "Morno", "Quente"]);
export const prioridadeSchema = z.enum([
  "Urgente",
  "Alerta",
  "Atencao",
  "Aten��o",
  "Normal",
]);
export const origemSchema = z.enum([
  "Instagram",
  "Indicacao",
  "Anuncio",
  "Evento",
  "WhatsApp",
  "Organico",
  "LinkedIn",
  "Site",
  "Outro",
]);
export const tipoContatoSchema = z.enum([
  "Ligacao",
  "WhatsApp",
  "Email",
  "Reuniao",
  "Visita",
  "Outro",
]);

// Date schema - accepts ISO strings, rejects invalid dates
const dateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Invalid date format",
});

// POST /api/leads schema
export const createLeadSchema = z
  .object({
    nome: z.string().min(1, "Nome is required"),
    cidade: z.string().optional(),
    origem: origemSchema,
    telefone: z.string().optional(),
    codigo: z.string().optional(),
    cadencia: cadenciaSchema,
    ultimoContato: z.union([dateSchema, z.null()]).optional(),
    temperatura: temperaturaSchema.optional(),
    observacao: z.string().optional().nullable(),
    dataEntrada: z.union([dateSchema, z.null()]).optional(),
    dataConversao: z.union([dateSchema, z.null()]).optional(), // Permitir mas ignorar na criação
    estimatedValueCents: z.number().int().min(0).optional().nullable(),
    statedValueCents: z.number().int().min(0).optional().nullable(),
    currency: z.string().min(1).max(3).optional(),
  })
  .passthrough(); // Permite campos extras sem erro

// PUT /api/leads/:id schema (all optional)
export const updateLeadSchema = z
  .object({
    nome: z.string().min(1).optional(),
    cidade: z.string().optional(),
    origem: origemSchema.optional(),
    telefone: z.string().optional(),
    codigo: z.string().optional(),
    cadencia: cadenciaSchema.optional(),
    ultimoContato: dateSchema.optional().nullable(),
    proximoContato: dateSchema.optional().nullable(),
    status: statusSchema.optional(),
    temperatura: temperaturaSchema.optional(),
    observacao: z.string().optional(),
    dataEntrada: dateSchema.optional(),
    dataConversao: dateSchema.optional().nullable(),
    estimatedValueCents: z.number().int().min(0).optional().nullable(),
    statedValueCents: z.number().int().min(0).optional().nullable(),
    currency: z.string().min(1).max(3).optional(),
  })
  .strict();

// POST /api/briefings schema
export const createBriefingSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  tipoContato: tipoContatoSchema,
  temperaturaAtualizada: temperaturaSchema,
  objetivo: z.string().optional(),
  conversa: z.string().optional(),
  resultado: z.string().optional(),
  interesseDemonstrado: z.string().optional(),
  objecoes: z.string().optional(),
  proximoPasso: z.string().optional(),
  proximoFollowUp: dateSchema.optional().nullable(),
});

// Validation middleware factory
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // Zod usa 'issues' em vez de 'errors'
    const errors = (result.error?.issues || []).map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
      received: e.received,
    }));
    console.error("Validation failed:", {
      body: req.body,
      errors: errors,
    });
    return res
      .status(400)
      .json({ error: "Validation failed", details: errors });
  }
  req.body = result.data;
  next();
};
