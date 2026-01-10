import express from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { isAdmin, isLeader, normalizeRole, requireRole } from '../middleware/roles.js';
import { normalizeStatus, normalizeOrigem, normalizePrioridade, normalizeTipoContato } from '../lib/enumMaps.js';

const router = express.Router();

router.use(requireAuth);

const isValidIsoDate = (value) => {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
};

const buildDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return filter;
};

// GET /api/leader/team
router.get('/team', requireRole('LEADER', 'ADMIN'), async (req, res, next) => {
  try {
    const role = normalizeRole(req.userRole);
    const where = isAdmin(role)
      ? { role: 'SELLER' }
      : { managerId: req.userId };

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    res.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
      }))
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/leader/summary
router.get('/summary', requireRole('LEADER', 'ADMIN'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (startDate && !isValidIsoDate(startDate)) {
      return res.status(400).json({ error: 'Invalid startDate' });
    }

    if (endDate && !isValidIsoDate(endDate)) {
      return res.status(400).json({ error: 'Invalid endDate' });
    }

    const role = normalizeRole(req.userRole);
    if (!isLeader(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const users = await prisma.user.findMany({
      where: isAdmin(role) ? { role: 'SELLER' } : { managerId: req.userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const sellerIds = users.map((user) => user.id);

    if (sellerIds.length === 0) {
      return res.json({
        totals: {
          leadsCount: 0,
          convertedCount: 0,
          totalEstimatedValueCents: 0,
          totalStatedValueCents: 0,
        },
        breakdown: [],
      });
    }

    const dateFilter = buildDateFilter(startDate, endDate);
    const whereClause = {
      userId: { in: sellerIds },
      ...(Object.keys(dateFilter).length > 0 && { dataEntrada: dateFilter }),
    };

    const [totals, convertedCount, groupedLeads, groupedConverted] = await Promise.all([
      prisma.lead.aggregate({
        where: whereClause,
        _count: { _all: true },
        _sum: { estimatedValueCents: true, statedValueCents: true },
      }),
      prisma.lead.count({
        where: { ...whereClause, status: 'Convertido' },
      }),
      prisma.lead.groupBy({
        by: ['userId'],
        where: whereClause,
        _count: { _all: true },
        _sum: { statedValueCents: true },
      }),
      prisma.lead.groupBy({
        by: ['userId'],
        where: { ...whereClause, status: 'Convertido' },
        _count: { _all: true },
      }),
    ]);

    const sellerMap = new Map(users.map((user) => [user.id, user.name || 'Sem nome']));
    const convertedMap = new Map(
      groupedConverted.map((row) => [row.userId, row._count._all ?? 0])
    );

    const breakdown = groupedLeads.map((row) => ({
      sellerId: row.userId,
      sellerName: sellerMap.get(row.userId) || 'Sem nome',
      leadsCount: row._count._all ?? 0,
      convertedCount: convertedMap.get(row.userId) ?? 0,
      totalStatedValueCents: row._sum.statedValueCents ?? 0,
    }));

    res.json({
      totals: {
        leadsCount: totals._count._all ?? 0,
        convertedCount,
        totalEstimatedValueCents: totals._sum.estimatedValueCents ?? 0,
        totalStatedValueCents: totals._sum.statedValueCents ?? 0,
      },
      breakdown,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/leader/seller/:sellerId - Detalhes completos de um vendedor
router.get('/seller/:sellerId', requireRole('LEADER', 'ADMIN'), async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const role = normalizeRole(req.userRole);

    // Verificar se o vendedor pertence à equipe do líder
    const seller = await prisma.user.findFirst({
      where: {
        id: sellerId,
        ...(isAdmin(role) ? { role: 'SELLER' } : { 
          role: 'SELLER',
          managerId: req.userId 
        }),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found or access denied' });
    }

    // Buscar todos os leads do vendedor
    const allLeads = await prisma.lead.findMany({
      where: { userId: sellerId },
      include: {
        historico: {
          orderBy: { data: 'desc' },
          take: 50, // Limitar histórico recente
        },
        briefings: {
          orderBy: { data: 'desc' },
          take: 50, // Limitar briefings recentes
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular métricas agregadas
    const totalLeads = allLeads.length;
    const convertedLeads = allLeads.filter(lead => lead.status === 'Convertido').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const totalStatedValueCents = allLeads.reduce((sum, lead) => sum + (lead.statedValueCents || 0), 0);
    const totalEstimatedValueCents = allLeads.reduce((sum, lead) => sum + (lead.estimatedValueCents || 0), 0);

    // Leads por status
    const leadsByStatus = {
      'Atrasado': 0,
      'Falar Hoje': 0,
      'Em Dia': 0,
      'Convertido': 0,
    };
    allLeads.forEach(lead => {
      const status = normalizeStatus.toFrontend(lead.status);
      if (leadsByStatus.hasOwnProperty(status)) {
        leadsByStatus[status]++;
      }
    });

    // Leads por origem
    const leadsByOriginMap = new Map();
    allLeads.forEach(lead => {
      const origem = normalizeOrigem.toFrontend(lead.origem);
      leadsByOriginMap.set(origem, (leadsByOriginMap.get(origem) || 0) + 1);
    });
    const leadsByOrigin = Array.from(leadsByOriginMap.entries())
      .map(([origin, count]) => ({ origin, count }))
      .sort((a, b) => b.count - a.count);

    // Leads por cidade
    const leadsByCityMap = new Map();
    allLeads.forEach(lead => {
      leadsByCityMap.set(lead.cidade, (leadsByCityMap.get(lead.cidade) || 0) + 1);
    });
    const leadsByCity = Array.from(leadsByCityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 cidades

    // Leads por cadência
    const leadsByCadenceMap = new Map();
    allLeads.forEach(lead => {
      leadsByCadenceMap.set(lead.cadencia, (leadsByCadenceMap.get(lead.cadencia) || 0) + 1);
    });
    const leadsByCadence = Array.from(leadsByCadenceMap.entries())
      .map(([cadence, count]) => ({ cadence, count }));

    // Timeline data (últimos 30 dias) - leads e conversões por dia
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const timelineData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const dateEnd = new Date(date.setHours(23, 59, 59, 999));

      const leadsOnDate = allLeads.filter(lead => {
        const leadDate = new Date(lead.dataEntrada);
        return leadDate >= dateStart && leadDate <= dateEnd;
      });

      const convertedOnDate = leadsOnDate.filter(lead => lead.status === 'Convertido');

      timelineData.push({
        date: dateStart.toISOString().split('T')[0],
        leadsCount: leadsOnDate.length,
        convertedCount: convertedOnDate.length,
      });
    }

    // Atividades recentes (últimos 20)
    const recentActivity = [];

    // Adicionar contatos recentes do histórico
    allLeads.forEach(lead => {
      lead.historico.slice(0, 5).forEach(hist => {
        recentActivity.push({
          type: 'contact',
          date: new Date(hist.data),
          leadId: lead.id,
          leadName: lead.nome,
          description: `Contato: ${normalizeTipoContato.toFrontend(hist.tipo)} - ${hist.resumo.substring(0, 50)}`,
        });
      });
    });

    // Adicionar briefings recentes
    allLeads.forEach(lead => {
      lead.briefings.slice(0, 5).forEach(briefing => {
        recentActivity.push({
          type: 'briefing',
          date: new Date(briefing.data),
          leadId: lead.id,
          leadName: lead.nome,
          description: `Briefing: ${briefing.objetivo.substring(0, 50)}`,
        });
      });
    });

    // Adicionar conversões recentes
    allLeads
      .filter(lead => lead.status === 'Convertido' && lead.dataConversao)
      .sort((a, b) => {
        const dateA = a.dataConversao ? new Date(a.dataConversao) : new Date(0);
        const dateB = b.dataConversao ? new Date(b.dataConversao) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10)
      .forEach(lead => {
        recentActivity.push({
          type: 'conversion',
          date: lead.dataConversao ? new Date(lead.dataConversao) : new Date(lead.updatedAt),
          leadId: lead.id,
          leadName: lead.nome,
          description: `Lead convertido - Valor: R$ ${((lead.statedValueCents || 0) / 100).toFixed(2)}`,
        });
      });

    // Ordenar atividades por data (mais recente primeiro)
    recentActivity.sort((a, b) => b.date.getTime() - a.date.getTime());
    recentActivity.splice(20); // Limitar a 20 atividades

    // Formatar leads para o frontend
    const formattedLeads = allLeads.map(lead => ({
      ...lead,
      status: normalizeStatus.toFrontend(lead.status),
      origem: normalizeOrigem.toFrontend(lead.origem),
      prioridade: normalizePrioridade.toFrontend(lead.prioridade),
      ultimoContato: lead.ultimoContato ? new Date(lead.ultimoContato) : null,
      proximoContato: lead.proximoContato ? new Date(lead.proximoContato) : null,
      dataEntrada: new Date(lead.dataEntrada),
      dataConversao: lead.dataConversao ? new Date(lead.dataConversao) : null,
      historico: lead.historico.map(h => ({
        ...h,
        data: new Date(h.data),
        status: normalizeStatus.toFrontend(h.status),
        tipo: normalizeTipoContato.toFrontend(h.tipo),
      })),
      briefings: lead.briefings.map(b => ({
        ...b,
        tipoContato: normalizeTipoContato.toFrontend(b.tipoContato),
        data: new Date(b.data),
        proximoFollowUp: b.proximoFollowUp ? new Date(b.proximoFollowUp) : null,
      })),
    }));

    res.json({
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        role: normalizeRole(seller.role),
      },
      metrics: {
        totalLeads,
        convertedLeads,
        conversionRate: Math.round(conversionRate * 10) / 10, // Arredondar para 1 decimal
        totalStatedValueCents,
        totalEstimatedValueCents,
        leadsByStatus,
        leadsByOrigin,
        leadsByCity,
        leadsByCadence,
      },
      leads: formattedLeads,
      timelineData,
      recentActivity: recentActivity.map(activity => ({
        ...activity,
        date: activity.date.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
