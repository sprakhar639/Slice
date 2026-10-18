import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db.js";
import { JWT_SECRET } from "../../config/env.js";
import { HttpError } from "../../shared/httpError.js";

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "Invalid credentials");
  return { token: jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "8h" }) };
}

export const getMe = (id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
