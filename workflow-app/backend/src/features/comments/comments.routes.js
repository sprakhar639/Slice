import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as c from "./comments.controller.js";

const router = Router();
router.post("/:id/comments", requireAuth, c.add);
export default router;
