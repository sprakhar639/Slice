import { pool } from "../../config/db.js";

const transitions = {
OPEN: ["IN_PROGRESS"],
IN_PROGRESS: ["OPEN", "AWAITING_APPROVAL"],
AWAITING_APPROVAL: ["IN_PROGRESS", "RESOLVED"],
RESOLVED: ["CLOSED"],
CLOSED: [],
};

export async function getTeamWorkItems(teamId, userId) {
return pool.query(
`SELECT w.*
     FROM "WorkItem" w
     JOIN "Membership" m ON m."teamId" = w."teamId"
     WHERE w."teamId" = $1 AND m."userId" = $2
     ORDER BY w."createdAt" DESC`,
[teamId, userId]
).then((result) => result.rows);
}

export async function createWorkItem(data, userId) {
const client = await pool.connect();

try {
await client.query("BEGIN");

```
const membership = await client.query(
  `SELECT role FROM "Membership"
   WHERE "teamId" = $1 AND "userId" = $2`,
  [data.teamId, userId]
);

if (!membership.rows.length) {
  const error = new Error("You are not a member of this team");
  error.statusCode = 403;
  throw error;
}

const result = await client.query(
  `INSERT INTO "WorkItem"
   (title, description, type, priority, status, "teamId",
    "assigneeId", "createdById", "dueDate", version,
    "createdAt", "updatedAt")
   VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8, 1, NOW(), NOW())
   RETURNING *`,
  [
    data.title,
    data.description ?? null,
    data.type,
    data.priority ?? "MEDIUM",
    data.teamId,
    data.assigneeId ?? null,
    userId,
    data.dueDate ?? null,
  ]
);

await client.query(
  `INSERT INTO "ActivityEvent"
   ("workItemId", "actorId", action, details, "createdAt")
   VALUES ($1, $2, 'CREATED', $3, NOW())`,
  [result.rows[0].id, userId, JSON.stringify({ status: "OPEN" })]
);

await client.query("COMMIT");
return result.rows[0];
```

} catch (error) {
await client.query("ROLLBACK");
throw error;
} finally {
client.release();
}
}

export async function changeWorkItemStatus(
itemId,
userId,
newStatus,
expectedVersion
) {
const client = await pool.connect();

try {
await client.query("BEGIN");

```
const result = await client.query(
  `SELECT w.*, m.role
   FROM "WorkItem" w
   JOIN "Membership" m
     ON m."teamId" = w."teamId" AND m."userId" = $2
   WHERE w.id = $1
   FOR UPDATE OF w`,
  [itemId, userId]
);

const item = result.rows[0];

if (!item) {
  const error = new Error("Work item not found");
  error.statusCode = 404;
  throw error;
}

if (item.version !== expectedVersion) {
  const error = new Error("Work item was modified. Refresh and retry.");
  error.statusCode = 409;
  throw error;
}

if (!transitions[item.status]?.includes(newStatus)) {
  const error = new Error("Invalid status transition");
  error.statusCode = 400;
  throw error;
}

if (
  item.status === "AWAITING_APPROVAL" &&
  newStatus === "RESOLVED" &&
  item.role !== "LEAD" &&
  item.role !== "ADMIN"
) {
  const error = new Error("Only a Lead or Admin can approve");
  error.statusCode = 403;
  throw error;
}

const updated = await client.query(
  `UPDATE "WorkItem"
   SET status = $1, version = version + 1, "updatedAt" = NOW()
   WHERE id = $2 AND version = $3
   RETURNING *`,
  [newStatus, itemId, expectedVersion]
);

if (!updated.rows.length) {
  const error = new Error("Work item was modified. Refresh and retry.");
  error.statusCode = 409;
  throw error;
}

await client.query(
  `INSERT INTO "ActivityEvent"
   ("workItemId", "actorId", action, details, "createdAt")
   VALUES ($1, $2, 'STATUS_CHANGED', $3, NOW())`,
  [
    itemId,
    userId,
    JSON.stringify({
      from: item.status,
      to: newStatus,
    }),
  ]
);

await client.query("COMMIT");
return updated.rows[0];
```

} catch (error) {
await client.query("ROLLBACK");
throw error;
} finally {
client.release();
}
}
