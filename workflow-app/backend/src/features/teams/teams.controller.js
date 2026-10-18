import * as service from "./teams.service.js";

export const listMine = async (req, res) => res.json(await service.listMyTeams(req.userId));
