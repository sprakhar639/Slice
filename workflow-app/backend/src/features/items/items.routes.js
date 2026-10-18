import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as c from "./items.controller.js";

const router = Router();
router.use(requireAuth);
router.post("/", c.create);
router.get("/", c.list);
router.get("/:id", c.get);
router.patch("/:id", c.update);
export default router;
