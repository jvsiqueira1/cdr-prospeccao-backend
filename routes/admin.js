import express from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeRole, requireRole } from '../middleware/roles.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

const ALLOWED_ROLES = new Set(['SELLER', 'LEADER', 'ADMIN']);

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, managerId: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        managerId: user.managerId ?? null,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const roleInput = typeof req.body.role === 'string' ? req.body.role.toUpperCase() : null;
    const managerIdInput = typeof req.body.managerId === 'string' ? req.body.managerId : null;

    if (!roleInput || !ALLOWED_ROLES.has(roleInput)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let managerId = null;
    if (roleInput === 'SELLER' && managerIdInput) {
      const manager = await prisma.user.findUnique({
        where: { id: managerIdInput },
        select: { id: true, role: true },
      });

      if (!manager) {
        return res.status(400).json({ error: 'Manager not found' });
      }

      const managerRole = normalizeRole(manager.role);
      if (managerRole !== 'LEADER' && managerRole !== 'ADMIN') {
        return res.status(400).json({ error: 'Manager must be LEADER or ADMIN' });
      }

      managerId = manager.id;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: roleInput, managerId },
      select: { id: true, name: true, email: true, role: true, managerId: true },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: normalizeRole(updated.role),
      managerId: updated.managerId ?? null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
