import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (!Number.isInteger(payload.uid)) throw new Error("Invalid token payload");
    req.userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
