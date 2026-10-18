import { pool } from "../../config/db.js";

export async function getUserTeams(userId) {
const result = await pool.query(
`SELECT t.id, t.name, m.role
     FROM "Team" t
     JOIN "Membership" m ON m."teamId" = t.id
     WHERE m."userId" = $1
     ORDER BY t.name`,
[userId]
);

return result.rows;
}

export async function getTeamRole(userId, teamId) {
const result = await pool.query(
`SELECT role
     FROM "Membership"
     WHERE "userId" = $1 AND "teamId" = $2`,
[userId, teamId]
);

return result.rows[0]?.role ?? null;
}
