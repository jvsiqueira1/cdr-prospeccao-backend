import express from 'express';
import { startOfDay } from 'date-fns';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

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

    if (!metricas) {
      metricas = await prisma.metricasDiarias.create({
        data: {
          userId: req.userId,
          data: hoje,
          ...req.body
        }
      });
    } else {
      metricas = await prisma.metricasDiarias.update({
        where: { 
          id: metricas.id
        },
        data: req.body
      });
    }

    res.json(metricas);
  } catch (error) {
    next(error);
  }
});

export default router;

