import { app } from "./app.js";
import { prisma } from "./config/db.js";

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => console.log(`API listening on :${port}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
