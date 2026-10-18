import { prisma } from "../../config/db.js";
import { HttpError } from "../../shared/httpError.js";
import { atLeast } from "../../shared/constants.js";
import { getRole } from "../teams/teams.service.js";

export async function addComment(userId, itemId, body) {
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  const role = item && (await getRole(prisma, userId, item.teamId));
  if (!item || !role) throw new HttpError(404, "Work item not found");
  if (!atLeast(role, "MEMBER")) throw new HttpError(403, "Viewers cannot comment");
  // activity rows are only ever inserted, never updated or deleted
  return prisma.activity.create({ data: { workItemId: itemId, actorId: userId, type: "COMMENT", data: { body } } });
}
