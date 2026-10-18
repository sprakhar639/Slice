import { Router } from "express";
import { getTeams } from "./team.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getTeams);

export default router;
