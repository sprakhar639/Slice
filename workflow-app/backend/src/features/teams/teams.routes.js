import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as c from "./teams.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/", c.listMine);
export default router;
