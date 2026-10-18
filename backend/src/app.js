import "dotenv/config";
import express from "express";
import session from "express-session";
import healthRoutes from "./health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

app.use(express.json());

app.use(
session({
name: "connect.sid",
secret: process.env.SESSION_SECRET,
resave: false,
saveUninitialized: false,
cookie: {
httpOnly: true,
sameSite: "lax",
secure: process.env.NODE_ENV === "production",
},
})
);

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);

export default app;
