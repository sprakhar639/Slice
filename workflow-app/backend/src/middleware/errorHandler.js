import { ZodError } from "zod";
import { HttpError } from "../shared/httpError.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) return res.status(400).json({ error: "Validation failed", details: err.issues });
  if (err instanceof HttpError) return res.status(err.code).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
