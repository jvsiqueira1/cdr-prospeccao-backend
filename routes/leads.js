import express from 'express';
import { addDays, isToday, isBefore, startOfDay, differenceInDays } from 'date-fns';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

/**
 * Helper functions
 * @typedef {Object} Lead
 * @property {string} status
 * @property {string} prioridade
 * @property {string} temperatura
 * @property {string} origem
 * @property {string} observacao
 */

/**
 * Calcula a data do próximo contato baseado na cadência
 * @param {Date | null} ultimoContato
 * @param {string} cadencia
 * @returns {Date | null}
 */
const calcularProximoContato = (ultimoContato, cadencia) => {
  if (!ultimoContato) return null;
  const dias = cadencia === 'Semanal' ? 7 : cadencia === 'Quinzenal' ? 15 : 30;
  return addDays(new Date(ultimoContato), dias);
};

/**
 * Calcula o status do lead baseado na data do próximo contato
 * @param {Date | null} proximoContato
 * @returns {string}
 */
const calcularStatus = (proximoContato) => {
  if (!proximoContato) return 'EmDia';
  const hoje = startOfDay(new Date());
  const proximo = startOfDay(new Date(proximoContato));
  
  if (isBefore(proximo, hoje)) return 'Atrasado';
  if (isToday(new Date(proximoContato))) return 'FalarHoje';
  return 'EmDia';
};

/**
 * Calcula a prioridade do lead
 * @param {string} status
 * @param {Date | null} proximoContato
 * @returns {string}
 */
const calcularPrioridade = (status, proximoContato) => {
  if (status === 'Atrasado') return 'Urgente';
  if (!proximoContato) return 'Normal';
  
  const diasAte = differenceInDays(startOfDay(new Date(proximoContato)), startOfDay(new Date()));
  if (diasAte <= 0) return 'Urgente';
  if (diasAte <= 2) return 'Alerta';
  if (isToday(new Date(proximoContato))) return 'Atencao';
  return 'Normal';
};

/**
 * Calcula o score do lead
 * @param {Lead} lead
 * @returns {number}
 */
const calcularScore = (lead) => {
  let score = 0;
  if (lead.status === 'Atrasado') score += 5;
  if (lead.prioridade === 'Alerta') score += 3;
  if (lead.temperatura === 'Quente') score += 3;
  if (['Indicacao', 'Evento'].includes(lead.origem)) score += 2;
  if (lead.observacao && lead.observacao.toLowerCase().includes('interesse')) score += 2;
  return score;
};

/**
 * Normaliza status do backend para o formato do frontend
 * @param {string} status
 * @returns {string}
 */
const normalizarStatusParaFrontend = (status) => {
  return status === 'FalarHoje' ? 'Falar Hoje' : status;
};

/**
 * Normaliza status do frontend para o formato do backend
 * @param {string} status
 * @returns {string}
 */
const normalizarStatusParaBackend = (status) => {
  return status === 'Falar Hoje' ? 'FalarHoje' : status;
};

// GET /api/leads - Listar todos os leads
router.get('/', async (req, res, next) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        userId: req.userId
      },
      include: {
        historico: {
          orderBy: { data: 'desc' }
        },
        briefings: {
          orderBy: { data: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Converter para o formato esperado pelo frontend
    const leadsFormatados = leads.map(lead => ({
      ...lead,
      status: normalizarStatusParaFrontend(lead.status),
      ultimoContato: lead.ultimoContato ? new Date(lead.ultimoContato) : null,
      proximoContato: lead.proximoContato ? new Date(lead.proximoContato) : null,
      dataEntrada: new Date(lead.dataEntrada),
      dataConversao: lead.dataConversao ? new Date(lead.dataConversao) : null,
      historico: lead.historico.map(h => ({
        ...h,
        data: new Date(h.data),
        status: normalizarStatusParaFrontend(h.status)
      }))
    }));

    res.json(leadsFormatados);
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/:id - Buscar lead por ID
router.get('/:id', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId
      },
      include: {
        historico: {
          orderBy: { data: 'desc' }
        },
        briefings: {
          orderBy: { data: 'desc' }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      ...lead,
      status: normalizarStatusParaFrontend(lead.status),
      ultimoContato: lead.ultimoContato ? new Date(lead.ultimoContato) : null,
      proximoContato: lead.proximoContato ? new Date(lead.proximoContato) : null,
      dataEntrada: new Date(lead.dataEntrada),
      dataConversao: lead.dataConversao ? new Date(lead.dataConversao) : null,
      historico: lead.historico.map(h => ({
        ...h,
        data: new Date(h.data),
        status: normalizarStatusParaFrontend(h.status)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads - Criar novo lead
router.post('/', async (req, res, next) => {
  try {
    const leadData = req.body;
    
    // Normalizar status para backend
    if (leadData.status) {
      leadData.status = normalizarStatusParaBackend(leadData.status);
    }

    const ultimoContato = leadData.ultimoContato ? new Date(leadData.ultimoContato) : null;
    const proximoContato = calcularProximoContato(ultimoContato, leadData.cadencia);
    const status = calcularStatus(proximoContato);
    const prioridade = calcularPrioridade(status, proximoContato);

    const novoLead = await prisma.lead.create({
      data: {
        userId: req.userId,
        nome: leadData.nome,
        cidade: leadData.cidade,
        origem: leadData.origem,
        telefone: leadData.telefone,
        codigo: leadData.codigo,
        cadencia: leadData.cadencia,
        ultimoContato: ultimoContato,
        proximoContato: proximoContato,
        status: status,
        temperatura: leadData.temperatura || 'Frio',
        observacao: leadData.observacao || '',
        prioridade: prioridade,
        score: 0,
        dataEntrada: leadData.dataEntrada ? new Date(leadData.dataEntrada) : new Date(),
        pontos: 0,
        nivel: 'Prospectador Iniciante',
        conquistas: []
      },
      include: {
        historico: true,
        briefings: true
      }
    });

    // Calcular score
    const score = calcularScore(novoLead);
    const leadAtualizado = await prisma.lead.update({
      where: { id: novoLead.id },
      data: { score }
    });

    res.status(201).json({
      ...leadAtualizado,
      status: normalizarStatusParaFrontend(leadAtualizado.status),
      ultimoContato: leadAtualizado.ultimoContato ? new Date(leadAtualizado.ultimoContato) : null,
      proximoContato: leadAtualizado.proximoContato ? new Date(leadAtualizado.proximoContato) : null,
      dataEntrada: new Date(leadAtualizado.dataEntrada),
      dataConversao: leadAtualizado.dataConversao ? new Date(leadAtualizado.dataConversao) : null,
      historico: []
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/leads/:id - Atualizar lead
router.put('/:id', async (req, res, next) => {
  try {
    const updates = req.body;
    
    // Normalizar status para backend
    if (updates.status) {
      updates.status = normalizarStatusParaBackend(updates.status);
    }

    const leadAtual = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!leadAtual) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Recalcular campos se necessário
    if (updates.ultimoContato !== undefined || updates.cadencia !== undefined) {
      const ultimoContato = updates.ultimoContato 
        ? new Date(updates.ultimoContato) 
        : leadAtual.ultimoContato;
      const cadencia = updates.cadencia || leadAtual.cadencia;
      updates.proximoContato = calcularProximoContato(ultimoContato, cadencia);
    }

    if (updates.proximoContato !== undefined && updates.status !== 'Convertido') {
      updates.status = calcularStatus(updates.proximoContato);
    }

    if (updates.status !== undefined || updates.proximoContato !== undefined) {
      updates.prioridade = calcularPrioridade(
        updates.status || leadAtual.status,
        updates.proximoContato || leadAtual.proximoContato
      );
    }

    // Converter datas
    if (updates.ultimoContato) updates.ultimoContato = new Date(updates.ultimoContato);
    if (updates.proximoContato) updates.proximoContato = new Date(updates.proximoContato);
    if (updates.dataEntrada) updates.dataEntrada = new Date(updates.dataEntrada);
    if (updates.dataConversao) updates.dataConversao = new Date(updates.dataConversao);

    const leadAtualizado = await prisma.lead.update({
      where: { 
        id: req.params.id,
        userId: req.userId
      },
      data: updates,
      include: {
        historico: {
          orderBy: { data: 'desc' }
        },
        briefings: {
          orderBy: { data: 'desc' }
        }
      }
    });

    // Recalcular score
    const score = calcularScore(leadAtualizado);
    const leadComScore = await prisma.lead.update({
      where: { 
        id: req.params.id,
        userId: req.userId
      },
      data: { score },
      include: {
        historico: {
          orderBy: { data: 'desc' }
        },
        briefings: {
          orderBy: { data: 'desc' }
        }
      }
    });

    res.json({
      ...leadComScore,
      status: normalizarStatusParaFrontend(leadComScore.status),
      ultimoContato: leadComScore.ultimoContato ? new Date(leadComScore.ultimoContato) : null,
      proximoContato: leadComScore.proximoContato ? new Date(leadComScore.proximoContato) : null,
      dataEntrada: new Date(leadComScore.dataEntrada),
      dataConversao: leadComScore.dataConversao ? new Date(leadComScore.dataConversao) : null,
      historico: leadComScore.historico.map(h => ({
        ...h,
        data: new Date(h.data),
        status: normalizarStatusParaFrontend(h.status)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/leads/:id - Deletar lead
router.delete('/:id', async (req, res, next) => {
  try {
    // Verificar se o lead pertence ao usuário antes de deletar
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await prisma.lead.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    next(error);
  }
});

// POST /api/leads/:id/contato - Registrar contato
router.post('/:id/contato', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const wasAtrasado = lead.status === 'Atrasado';
    const hoje = new Date();
    const briefing = req.body.briefing || {};

    // Criar histórico
    const novoHistorico = await prisma.historicoContato.create({
      data: {
        leadId: lead.id,
        data: hoje,
        tipo: briefing.tipoContato || 'Ligacao',
        temperatura: lead.temperatura,
        status: lead.status,
        resumo: briefing.conversa || 'Contato registrado',
        proximoPasso: briefing.proximoPasso || '',
        responsavel: 'Usuário'
      }
    });

    // Atualizar lead
    const proximoContato = calcularProximoContato(hoje, lead.cadencia);
    const status = calcularStatus(proximoContato);
    const prioridade = calcularPrioridade(status, proximoContato);

    const leadAtualizado = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ultimoContato: hoje,
        proximoContato: proximoContato,
        status: status,
        prioridade: prioridade
      },
      include: {
        historico: {
          orderBy: { data: 'desc' }
        },
        briefings: {
          orderBy: { data: 'desc' }
        }
      }
    });

    res.json({
      ...leadAtualizado,
      status: normalizarStatusParaFrontend(leadAtualizado.status),
      ultimoContato: leadAtualizado.ultimoContato ? new Date(leadAtualizado.ultimoContato) : null,
      proximoContato: leadAtualizado.proximoContato ? new Date(leadAtualizado.proximoContato) : null,
      dataEntrada: new Date(leadAtualizado.dataEntrada),
      dataConversao: leadAtualizado.dataConversao ? new Date(leadAtualizado.dataConversao) : null,
      historico: leadAtualizado.historico.map(h => ({
        ...h,
        data: new Date(h.data),
        status: normalizarStatusParaFrontend(h.status)
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;

