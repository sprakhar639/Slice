import { z } from "zod";
import * as service from "./auth.service.js";

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });

export const login = async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  res.json(await service.login(email, password));
};

export const me = async (req, res) => res.json(await service.getMe(req.userId));
