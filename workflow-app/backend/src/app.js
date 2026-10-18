import express from "express";
import cors from "cors";
import authRoutes from "./features/auth/auth.routes.js";
import teamsRoutes from "./features/teams/teams.routes.js";
import itemsRoutes from "./features/items/items.routes.js";
import commentsRoutes from "./features/comments/comments.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/teams", teamsRoutes);
app.use("/items", itemsRoutes);
app.use("/items", commentsRoutes); // POST /items/:id/comments

app.use(errorHandler);
