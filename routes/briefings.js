import express from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeTipoContato } from '../lib/enumMaps.js';
import { validate, createBriefingSchema } from '../middleware/validation.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

// POST /api/briefings - Criar briefing
router.post('/', validate(createBriefingSchema), async (req, res, next) => {
  try {
    const briefingData = req.body;

    // Verificar se o lead pertence ao usuário ANTES de criar o briefing
    const lead = await prisma.lead.findFirst({
      where: {
        id: briefingData.leadId,
        userId: req.userId
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Criar briefing, histórico e atualizar lead em uma única transação
    const [briefing] = await prisma.$transaction([
      prisma.briefing.create({
        data: {
          leadId: briefingData.leadId,
          tipoContato: normalizeTipoContato.toBackend(briefingData.tipoContato),
          objetivo: briefingData.objetivo || '',
          conversa: briefingData.conversa || '',
          resultado: briefingData.resultado || '',
          interesseDemonstrado: briefingData.interesseDemonstrado || '',
          objecoes: briefingData.objecoes || '',
          proximoPasso: briefingData.proximoPasso || '',
          proximoFollowUp: briefingData.proximoFollowUp ? new Date(briefingData.proximoFollowUp) : null,
          temperaturaAtualizada: briefingData.temperaturaAtualizada
        }
      }),
      prisma.historicoContato.create({
        data: {
          leadId: lead.id,
          data: new Date(),
          tipo: normalizeTipoContato.toBackend(briefingData.tipoContato),
          temperatura: briefingData.temperaturaAtualizada,
          status: lead.status,
          resumo: briefingData.conversa,
          proximoPasso: briefingData.proximoPasso,
          responsavel: 'Usuário'
        }
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          temperatura: briefingData.temperaturaAtualizada,
          ultimoContato: new Date()
        }
      })
    ]);

    res.status(201).json({
      ...briefing,
      tipoContato: normalizeTipoContato.toFrontend(briefing.tipoContato),
      data: new Date(briefing.data),
      proximoFollowUp: briefing.proximoFollowUp ? new Date(briefing.proximoFollowUp) : null
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/briefings/lead/:leadId - Buscar briefings de um lead
router.get('/lead/:leadId', async (req, res, next) => {
  try {
    // Verificar se o lead pertence ao usuário
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.leadId,
        userId: req.userId
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const briefings = await prisma.briefing.findMany({
      where: { leadId: req.params.leadId },
      orderBy: { data: 'desc' }
    });

    res.json(briefings.map(b => ({
      ...b,
      tipoContato: normalizeTipoContato.toFrontend(b.tipoContato),
      data: new Date(b.data),
      proximoFollowUp: b.proximoFollowUp ? new Date(b.proximoFollowUp) : null
    })));
  } catch (error) {
    next(error);
  }
});

export default router;

