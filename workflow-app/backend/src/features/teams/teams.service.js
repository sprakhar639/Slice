import { prisma } from "../../config/db.js";

// role of a user in a team (undefined if not a member). `db` can be prisma or a transaction client.
export async function getRole(db, userId, teamId) {
  const m = await db.membership.findUnique({ where: { userId_teamId: { userId, teamId } } });
  return m?.role;
}

// teams I belong to, my role in each, and the teammates (used for assignee dropdowns)
export async function listMyTeams(userId) {
  const rows = await prisma.membership.findMany({
    where: { userId },
    include: { team: { include: { memberships: { include: { user: { select: { id: true, name: true } } } } } } },
  });
  return rows.map((r) => ({
    id: r.team.id,
    name: r.team.name,
    role: r.role,
    members: r.team.memberships.map((m) => ({ id: m.user.id, name: m.user.name, role: m.role })),
  }));
}
