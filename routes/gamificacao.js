import express from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

// Constantes de configuração
const PENALIDADE_INATIVIDADE = 5; // Pontos perdidos por dia de inatividade

// Field whitelist for PUT /api/gamificacao
const GAMIFICACAO_ALLOWED_FIELDS = [
  'pontosHoje', 'pontosSemana', 'pontosMes', 'conquistas', 'progressoDiario'
];

const sanitizeFields = (body, allowed) => {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  );
};

const calcularNivel = (pontos) => {
  if (pontos >= 600) return 'Closer';
  if (pontos >= 301) return 'Cadência Master';
  if (pontos >= 151) return 'Consistente';
  if (pontos >= 51) return 'Persistente';
  return 'Prospectador Iniciante';
};

const gerarMissoesDiarias = (gamificacaoId) => [
  { 
    gamificacaoId,
    descricao: 'Falar com 5 leads', 
    meta: 5, 
    progresso: 0, 
    concluida: false, 
    pontos: 5 
  },
  { 
    gamificacaoId,
    descricao: 'Esquentar 2 leads', 
    meta: 2, 
    progresso: 0, 
    concluida: false, 
    pontos: 5 
  },
  { 
    gamificacaoId,
    descricao: 'Resolver todos atrasados', 
    meta: 1, 
    progresso: 0, 
    concluida: false, 
    pontos: 10 
  },
];

// Função para aplicar penalidade por inatividade
const aplicarPenalidadeInatividade = async (gamificacao) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const ultimaAtividade = gamificacao.ultimaAtividade
    ? new Date(gamificacao.ultimaAtividade)
    : null;

  const ultimaAtividadeDate = ultimaAtividade
    ? (() => {
        const date = new Date(ultimaAtividade);
        date.setHours(0, 0, 0, 0);
        return date;
      })()
    : null;

  const ultimaAtividadeHoje = ultimaAtividadeDate
    ? ultimaAtividadeDate.getTime() === hoje.getTime()
    : false;

  // Verificar se está inativo: sem pontos hoje E última atividade não é hoje
  // E ultimaAtividade não foi atualizada hoje (para evitar penalidades duplicadas)
  const estaInativo = gamificacao.pontosHoje === 0 && !ultimaAtividadeHoje;

  if (estaInativo) {
    // Calcular novos valores de pontos (não podem ficar negativos)
    const novosPontosHoje = Math.max(0, gamificacao.pontosHoje - PENALIDADE_INATIVIDADE);
    const novosPontosSemana = Math.max(0, gamificacao.pontosSemana - PENALIDADE_INATIVIDADE);
    const novosPontosMes = Math.max(0, gamificacao.pontosMes - PENALIDADE_INATIVIDADE);

    // Atualizar gamificação com penalidade e marcar ultimaAtividade para hoje
    // (para evitar penalidades duplicadas)
    const gamificacaoAtualizada = await prisma.gamificacao.update({
      where: { id: gamificacao.id },
      data: {
        pontosHoje: novosPontosHoje,
        pontosSemana: novosPontosSemana,
        pontosMes: novosPontosMes,
        ultimaAtividade: new Date(), // Marcar como verificado hoje
        nivel: calcularNivel(novosPontosMes)
      },
      include: {
        missoesDiarias: true
      }
    });

    return gamificacaoAtualizada;
  }

  return gamificacao;
};

// GET /api/gamificacao - Buscar ou criar gamificação
router.get('/', async (req, res, next) => {
  try {
    let gamificacao = await prisma.gamificacao.findUnique({
      where: { userId: req.userId },
      include: {
        missoesDiarias: true
      }
    });

    if (!gamificacao) {
      gamificacao = await prisma.gamificacao.create({
        data: {
          userId: req.userId,
          pontosHoje: 0,
          pontosSemana: 0,
          pontosMes: 0,
          nivel: 'Prospectador Iniciante',
          conquistas: [],
          progressoDiario: 0
        }
      });

      // Criar missões diárias
      const missoes = gerarMissoesDiarias(gamificacao.id);
      await prisma.missaoDiaria.createMany({
        data: missoes
      });

      gamificacao = await prisma.gamificacao.findUnique({
        where: { id: gamificacao.id },
        include: {
          missoesDiarias: true
        }
      });
    }

    // Aplicar penalidade por inatividade se necessário
    gamificacao = await aplicarPenalidadeInatividade(gamificacao);

    res.json({
      ...gamificacao,
      nivel: calcularNivel(gamificacao.pontosMes)
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/gamificacao - Atualizar gamificação
router.put('/', async (req, res, next) => {
  try {
    let gamificacao = await prisma.gamificacao.findUnique({
      where: { userId: req.userId }
    });

    if (!gamificacao) {
      gamificacao = await prisma.gamificacao.create({
        data: {
          userId: req.userId,
          pontosHoje: 0,
          pontosSemana: 0,
          pontosMes: 0,
          nivel: 'Prospectador Iniciante',
          conquistas: [],
          progressoDiario: 0
        }
      });
    }

    const updates = sanitizeFields(req.body, GAMIFICACAO_ALLOWED_FIELDS);
    if (updates.pontosMes !== undefined) {
      updates.nivel = calcularNivel(updates.pontosMes);
    }

    const gamificacaoAtualizada = await prisma.gamificacao.update({
      where: { userId: req.userId },
      data: updates,
      include: {
        missoesDiarias: true
      }
    });

    res.json({
      ...gamificacaoAtualizada,
      nivel: calcularNivel(gamificacaoAtualizada.pontosMes)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/gamificacao/pontos - Adicionar pontos
router.post('/pontos', async (req, res, next) => {
  try {
    const { pontos } = req.body;

    // Validate pontos: integer, >0, <=50
    if (typeof pontos !== 'number' || !Number.isInteger(pontos) || pontos <= 0 || pontos > 50) {
      return res.status(400).json({ error: 'pontos must be an integer between 1 and 50' });
    }

    // Upsert with increment
    const gamificacaoAtualizada = await prisma.gamificacao.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId,
        pontosHoje: pontos,
        pontosSemana: pontos,
        pontosMes: pontos,
        nivel: calcularNivel(pontos),
        conquistas: [],
        progressoDiario: 0,
        ultimaAtividade: new Date()
      },
      update: {
        pontosHoje: { increment: pontos },
        pontosSemana: { increment: pontos },
        pontosMes: { increment: pontos },
        ultimaAtividade: new Date()
      },
      include: {
        missoesDiarias: true
      }
    });

    // Recalculate nivel after increment
    const nivel = calcularNivel(gamificacaoAtualizada.pontosMes);
    if (nivel !== gamificacaoAtualizada.nivel) {
      await prisma.gamificacao.update({
        where: { userId: req.userId },
        data: { nivel }
      });
      gamificacaoAtualizada.nivel = nivel;
    }

    res.json(gamificacaoAtualizada);
  } catch (error) {
    next(error);
  }
});

// PUT /api/gamificacao/missoes/:id - Completar missão
router.put('/missoes/:id', async (req, res, next) => {
  try {
    const missao = await prisma.missaoDiaria.findFirst({
      where: { 
        id: req.params.id,
        gamificacao: {
          userId: req.userId
        }
      },
      include: { gamificacao: true }
    });

    if (!missao) {
      return res.status(404).json({ error: 'Missão not found' });
    }

    const missaoAtualizada = await prisma.missaoDiaria.update({
      where: { id: req.params.id },
      data: {
        concluida: true,
        progresso: missao.meta
      }
    });

    // Verificar se todas as missões foram concluídas
    const todasMissoes = await prisma.missaoDiaria.findMany({
      where: { gamificacaoId: missao.gamificacaoId }
    });

    const todasConcluidas = todasMissoes.every(m => m.id === missao.id || m.concluida);
    const pontosBonus = missao.pontos;
    const pontosExtras = todasConcluidas ? 20 : 0;

    const gamificacaoAtualizada = await prisma.gamificacao.update({
      where: { id: missao.gamificacaoId },
      data: {
        pontosHoje: missao.gamificacao.pontosHoje + pontosBonus + pontosExtras,
        pontosSemana: missao.gamificacao.pontosSemana + pontosBonus + pontosExtras,
        pontosMes: missao.gamificacao.pontosMes + pontosBonus + pontosExtras,
        ultimaAtividade: new Date()
      },
      include: {
        missoesDiarias: true
      }
    });

    res.json({
      ...gamificacaoAtualizada,
      nivel: calcularNivel(gamificacaoAtualizada.pontosMes)
    });
  } catch (error) {
    next(error);
  }
});

export default router;

