import { prisma } from "../../config/db.js";
import { HttpError } from "../../shared/httpError.js";
import { atLeast } from "../../shared/constants.js";
import { getRole } from "../teams/teams.service.js";
import { transitionError } from "./workflow.js";

const person = { select: { id: true, name: true } };
const itemInclude = { assignee: person, createdBy: person, team: person };

export async function createItem(userId, b) {
  if (!atLeast(await getRole(prisma, userId, b.teamId), "MEMBER")) throw new HttpError(403, "Need Member role in this team");
  if (b.assigneeId != null && !(await getRole(prisma, b.assigneeId, b.teamId)))
    throw new HttpError(400, "Assignee must be a member of the team");
  return prisma.workItem.create({
    data: {
      title: b.title,
      description: b.description,
      type: b.type,
      priority: b.priority,
      teamId: b.teamId,
      assigneeId: b.assigneeId ?? null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      createdById: userId,
      activities: { create: { actorId: userId, type: "CREATED", data: { title: b.title } } },
    },
    include: itemInclude,
  });
}

// dashboard + search + filters + pagination in one query builder
export async function listItems(userId, q) {
  const memberships = await prisma.membership.findMany({ where: { userId } });

  // users only ever see items of teams they belong to
  let scope = memberships.map((m) => m.teamId);
  if (q.teamId) scope = scope.filter((t) => t === q.teamId);
  if (q.view === "awaiting_approval") {
    const leadTeams = memberships.filter((m) => atLeast(m.role, "LEAD")).map((m) => m.teamId);
    scope = scope.filter((t) => leadTeams.includes(t));
  }

  const and = [{ teamId: { in: scope } }];
  if (q.view === "assigned") and.push({ assigneeId: userId, status: { not: "CLOSED" } });
  if (q.view === "unassigned_urgent")
    and.push({ assigneeId: null, priority: "URGENT", status: { notIn: ["RESOLVED", "CLOSED"] } });
  if (q.view === "awaiting_approval") and.push({ status: "AWAITING_APPROVAL" });
  if (q.status) and.push({ status: q.status });
  if (q.priority) and.push({ priority: q.priority });
  if (q.type) and.push({ type: q.type });
  if (q.q)
    and.push({
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ],
    });
  const where = { AND: and };

  const [items, total] = await Promise.all([
    prisma.workItem.findMany({
      where,
      include: itemInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.workItem.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function getItem(userId, id) {
  const item = await prisma.workItem.findUnique({
    where: { id },
    include: {
      ...itemInclude,
      activities: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { actor: person } },
    },
  });
  const myRole = item && (await getRole(prisma, userId, item.teamId));
  if (!item || !myRole) throw new HttpError(404, "Work item not found");
  return { ...item, myRole };
}

export function updateItem(userId, id, b) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.workItem.findUnique({ where: { id } });
    const role = item && (await getRole(tx, userId, item.teamId));
    if (!item || !role) throw new HttpError(404, "Work item not found");
    if (!atLeast(role, "MEMBER")) throw new HttpError(403, "Viewers cannot edit work items");
    if (item.version !== b.version) throw new HttpError(409, "Item was changed by someone else. Reload and retry.");
    if (item.status === "CLOSED") throw new HttpError(400, "Closed items are read-only");

    // collect activity events for every change
    const events = [];
    if (b.status && b.status !== item.status) {
      const err = transitionError(item.status, b.status, role);
      if (err) throw new HttpError(err.code, err.msg);
      events.push({ type: "STATUS_CHANGE", data: { from: item.status, to: b.status } });
    }
    if (b.priority && b.priority !== item.priority)
      events.push({ type: "PRIORITY_CHANGE", data: { from: item.priority, to: b.priority } });
    if (b.assigneeId !== undefined && b.assigneeId !== item.assigneeId) {
      if (b.assigneeId !== null && !(await getRole(tx, b.assigneeId, item.teamId)))
        throw new HttpError(400, "Assignee must be a member of the team");
      events.push({ type: "ASSIGNEE_CHANGE", data: { from: item.assigneeId, to: b.assigneeId } });
    }
    const fields = [];
    if (b.title !== undefined && b.title !== item.title) fields.push("title");
    if (b.description !== undefined && b.description !== item.description) fields.push("description");
    if (b.dueDate !== undefined && (b.dueDate ? new Date(b.dueDate).getTime() : null) !== (item.dueDate?.getTime() ?? null))
      fields.push("dueDate");
    if (fields.length) events.push({ type: "FIELDS_UPDATED", data: { fields } });
    if (!events.length) throw new HttpError(400, "No changes");

    // conditional update on version = no lost updates even under concurrency
    const { count } = await tx.workItem.updateMany({
      where: { id, version: item.version },
      data: {
        title: b.title,
        description: b.description,
        priority: b.priority,
        status: b.status,
        assigneeId: b.assigneeId,
        dueDate: b.dueDate === undefined ? undefined : b.dueDate ? new Date(b.dueDate) : null,
        version: { increment: 1 },
      },
    });
    if (!count) throw new HttpError(409, "Item was changed by someone else. Reload and retry.");
    await tx.activity.createMany({ data: events.map((e) => ({ ...e, workItemId: id, actorId: userId })) });
    return tx.workItem.findUnique({ where: { id }, include: itemInclude });
  });
}
