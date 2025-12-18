import express from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

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

    const updates = req.body;
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

    const gamificacaoAtualizada = await prisma.gamificacao.update({
      where: { userId: req.userId },
      data: {
        pontosHoje: gamificacao.pontosHoje + pontos,
        pontosSemana: gamificacao.pontosSemana + pontos,
        pontosMes: gamificacao.pontosMes + pontos,
        nivel: calcularNivel(gamificacao.pontosMes + pontos)
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
        pontosMes: missao.gamificacao.pontosMes + pontosBonus + pontosExtras
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

