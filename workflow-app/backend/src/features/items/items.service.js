import { prisma } from "../../config/db.js";
import { HttpError } from "../../shared/httpError.js";
import { atLeast } from "../../shared/constants.js";
import { getRole } from "../teams/teams.service.js";
import { transitionError } from "./workflow.js";

const person = {
  select: {
    id: true,
    name: true,
  },
};

const itemInclude = {
  assignee: person,
  createdBy: person,
  team: person,
};

export async function createItem(userId, b) {
  const role = await getRole(prisma, userId, b.teamId);

  if (!atLeast(role, "MEMBER")) {
    throw new HttpError(
      403,
      "Need Member role in this team"
    );
  }

  if (b.assigneeId != null) {
    const assigneeRole = await getRole(
      prisma,
      b.assigneeId,
      b.teamId
    );

    if (!assigneeRole) {
      throw new HttpError(
        400,
        "Assignee must be a member of the team"
      );
    }
  }

  return prisma.workItem.create({
    data: {
      title: b.title,
      description: b.description,
      type: b.type,
      priority: b.priority,
      teamId: b.teamId,
      assigneeId: b.assigneeId ?? null,
      dueDate: b.dueDate
        ? new Date(b.dueDate)
        : null,
      createdById: userId,

      activities: {
        create: {
          actorId: userId,
          type: "CREATED",
          data: {
            title: b.title,
          },
        },
      },
    },

    include: itemInclude,
  });
}

export async function listItems(userId, q) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
  });

  let teamIds = memberships.map(
    (membership) => membership.teamId
  );

  // Never allow a team filter to grant access to another team.
  if (q.teamId !== undefined) {
    teamIds = teamIds.filter(
      (teamId) => teamId === q.teamId
    );
  }

  if (q.view === "awaiting_approval") {
    const leadTeamIds = memberships
      .filter((membership) =>
        atLeast(membership.role, "LEAD")
      )
      .map((membership) => membership.teamId);

    teamIds = teamIds.filter(
      (teamId) => leadTeamIds.includes(teamId)
    );
  }

  const conditions = [
    {
      teamId: {
        in: teamIds,
      },
    },
  ];

  if (q.view === "assigned") {
    conditions.push({
      assigneeId: userId,
      status: {
        not: "CLOSED",
      },
    });
  }

  if (q.view === "unassigned_urgent") {
    conditions.push({
      assigneeId: null,
      priority: "URGENT",
      status: {
        notIn: ["RESOLVED", "CLOSED"],
      },
    });
  }

  if (q.view === "awaiting_approval") {
    conditions.push({
      status: "AWAITING_APPROVAL",
    });
  }

  if (q.status) {
    conditions.push({
      status: q.status,
    });
  }

  if (q.priority) {
    conditions.push({
      priority: q.priority,
    });
  }

  if (q.type) {
    conditions.push({
      type: q.type,
    });
  }

  if (q.q?.trim()) {
    const searchTerm = q.q.trim();

    conditions.push({
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  const where = {
    AND: conditions,
  };

  const rows = await prisma.workItem.findMany({
    where,

    include: itemInclude,

    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],

    ...(q.cursor
      ? {
          cursor: {
            id: q.cursor,
          },
          skip: 1,
        }
      : {}),

    take: q.pageSize + 1,
  });

  const hasMore = rows.length > q.pageSize;

  const items = hasMore
    ? rows.slice(0, q.pageSize)
    : rows;

  const total = await prisma.workItem.count({
    where,
  });

  return {
    items,
    total,
    pageSize: q.pageSize,
    hasMore,

    nextCursor: hasMore
      ? items[items.length - 1].id
      : null,
  };
}

export async function getItem(userId, id) {
  const item = await prisma.workItem.findUnique({
    where: { id },

    include: {
      ...itemInclude,

      activities: {
        orderBy: [
          { createdAt: "asc" },
          { id: "asc" },
        ],

        include: {
          actor: person,
        },
      },
    },
  });

  const myRole =
    item && (await getRole(
      prisma,
      userId,
      item.teamId
    ));

  if (!item || !myRole) {
    throw new HttpError(
      404,
      "Work item not found"
    );
  }

  return {
    ...item,
    myRole,
  };
}

export function updateItem(userId, id, b) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.workItem.findUnique({
      where: { id },
    });

    const role =
      item && (await getRole(
        tx,
        userId,
        item.teamId
      ));

    if (!item || !role) {
      throw new HttpError(
        404,
        "Work item not found"
      );
    }

    if (!atLeast(role, "MEMBER")) {
      throw new HttpError(
        403,
        "Viewers cannot edit work items"
      );
    }

    if (item.version !== b.version) {
      throw new HttpError(
        409,
        "Item was changed by someone else. Reload and retry."
      );
    }

    if (item.status === "CLOSED") {
      throw new HttpError(
        400,
        "Closed items are read-only"
      );
    }

    const events = [];

    if (b.status && b.status !== item.status) {
      const error = transitionError(
        item.status,
        b.status,
        role
      );

      if (error) {
        throw new HttpError(
          error.code,
          error.msg
        );
      }

      events.push({
        type: "STATUS_CHANGE",
        data: {
          from: item.status,
          to: b.status,
        },
      });
    }

    if (
      b.priority &&
      b.priority !== item.priority
    ) {
      events.push({
        type: "PRIORITY_CHANGE",
        data: {
          from: item.priority,
          to: b.priority,
        },
      });
    }

    if (
      b.assigneeId !== undefined &&
      b.assigneeId !== item.assigneeId
    ) {
      if (b.assigneeId !== null) {
        const assigneeRole = await getRole(
          tx,
          b.assigneeId,
          item.teamId
        );

        if (!assigneeRole) {
          throw new HttpError(
            400,
            "Assignee must be a member of the team"
          );
        }
      }

      events.push({
        type: "ASSIGNEE_CHANGE",
        data: {
          from: item.assigneeId,
          to: b.assigneeId,
        },
      });
    }

    const changedFields = [];

    if (
      b.title !== undefined &&
      b.title !== item.title
    ) {
      changedFields.push("title");
    }

    if (
      b.description !== undefined &&
      b.description !== item.description
    ) {
      changedFields.push("description");
    }

    if (
      b.dueDate !== undefined &&
      (b.dueDate
        ? new Date(b.dueDate).getTime()
        : null) !== (item.dueDate?.getTime() ?? null)
    ) {
      changedFields.push("dueDate");
    }

    if (changedFields.length) {
      events.push({
        type: "FIELDS_UPDATED",
        data: {
          fields: changedFields,
        },
      });
    }

    if (!events.length) {
      throw new HttpError(
        400,
        "No changes"
      );
    }

    const { count } = await tx.workItem.updateMany({
      where: {
        id,
        version: item.version,
      },

      data: {
        title: b.title,
        description: b.description,
        priority: b.priority,
        status: b.status,
        assigneeId: b.assigneeId,

        dueDate:
          b.dueDate === undefined
            ? undefined
            : b.dueDate
              ? new Date(b.dueDate)
              : null,

        version: {
          increment: 1,
        },
      },
    });

    if (!count) {
      throw new HttpError(
        409,
        "Item was changed by someone else. Reload and retry."
      );
    }

    await tx.activity.createMany({
      data: events.map((event) => ({
        ...event,
        workItemId: id,
        actorId: userId,
      })),
    });

    return tx.workItem.findUnique({
      where: { id },
      include: itemInclude,
    });
  });
}