import express from 'express';
import { startOfDay } from 'date-fns';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

// Field whitelist for PUT /api/metricas
const METRICAS_ALLOWED_FIELDS = [
  'contatosFeitos', 'atrasosResolvidos', 'novosLeads',
  'leadsQuentesTrabalhados', 'taxaRitmo'
];

// Whitelist for incrementable fields (integers only)
const INCREMENT_ALLOWED_FIELDS = [
  'contatosFeitos', 'atrasosResolvidos', 'novosLeads', 'leadsQuentesTrabalhados'
];

const sanitizeFields = (body, allowed) => {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  );
};

// GET /api/metricas - Buscar métricas do dia
router.get('/', async (req, res, next) => {
  try {
    const hoje = startOfDay(new Date());

    let metricas = await prisma.metricasDiarias.findFirst({
      where: { 
        userId: req.userId,
        data: hoje
      }
    });

    if (!metricas) {
      metricas = await prisma.metricasDiarias.create({
        data: {
          userId: req.userId,
          data: hoje,
          contatosFeitos: 0,
          atrasosResolvidos: 0,
          novosLeads: 0,
          leadsQuentesTrabalhados: 0,
          taxaRitmo: 0
        }
      });
    }

    res.json(metricas);
  } catch (error) {
    next(error);
  }
});

// PUT /api/metricas - Atualizar métricas
router.put('/', async (req, res, next) => {
  try {
    const hoje = startOfDay(new Date());

    let metricas = await prisma.metricasDiarias.findFirst({
      where: { 
        userId: req.userId,
        data: hoje
      }
    });

    const sanitizedData = sanitizeFields(req.body, METRICAS_ALLOWED_FIELDS);

    if (!metricas) {
      metricas = await prisma.metricasDiarias.create({
        data: {
          userId: req.userId,
          data: hoje,
          ...sanitizedData
        }
      });
    } else {
      metricas = await prisma.metricasDiarias.update({
        where: {
          id: metricas.id
        },
        data: sanitizedData
      });
    }

    res.json(metricas);
  } catch (error) {
    next(error);
  }
});

// POST /api/metricas/increment - Incrementar contadores
router.post('/increment', async (req, res, next) => {
  try {
    const hoje = startOfDay(new Date());

    // Build increment object from allowed fields only
    const increments = {};
    for (const field of INCREMENT_ALLOWED_FIELDS) {
      if (typeof req.body[field] === 'number' && req.body[field] > 0) {
        increments[field] = { increment: req.body[field] };
      }
    }

    // Upsert: create if not exists, increment if exists
    const metricas = await prisma.metricasDiarias.upsert({
      where: {
        userId_data: {
          userId: req.userId,
          data: hoje
        }
      },
      create: {
        userId: req.userId,
        data: hoje,
        contatosFeitos: req.body.contatosFeitos || 0,
        atrasosResolvidos: req.body.atrasosResolvidos || 0,
        novosLeads: req.body.novosLeads || 0,
        leadsQuentesTrabalhados: req.body.leadsQuentesTrabalhados || 0,
        taxaRitmo: 0
      },
      update: increments
    });

    res.json(metricas);
  } catch (error) {
    next(error);
  }
});

export default router;

