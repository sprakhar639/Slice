import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as c from "./auth.controller.js";

const router = Router();
router.post("/login", c.login);
router.get("/me", requireAuth, c.me);
export default router;
