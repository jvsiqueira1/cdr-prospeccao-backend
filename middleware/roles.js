import prisma from '../lib/prisma.js';

const DEFAULT_ROLE = 'SELLER';

export const normalizeRole = (role) => role || DEFAULT_ROLE;

export const isAdmin = (role) => normalizeRole(role) === 'ADMIN';

export const isLeader = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'LEADER' || normalized === 'ADMIN';
};

/**
 * Role-based access control middleware.
 * @param  {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });

    const role = normalizeRole(user?.role);

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.userRole = role;
    next();
  };
}
