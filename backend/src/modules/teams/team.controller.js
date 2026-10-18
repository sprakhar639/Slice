import { getUserTeams } from "./team.service.js";

export async function getTeams(req, res, next) {
try {
const teams = await getUserTeams(req.session.user.id);
res.status(200).json({ teams });
} catch (error) {
next(error);
}
}
