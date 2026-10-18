import bcrypt from "bcryptjs";
import { prisma } from "../src/config/db.js";
import { PRIORITIES, STATUSES, TYPES } from "../src/shared/constants.js";

async function main() {
  if ((await prisma.user.count()) > 0) return console.log("Already seeded");
  const passwordHash = await bcrypt.hash("password123", 10);
  const mk = (email, name) => prisma.user.create({ data: { email, name, passwordHash } });
  const [admin, lee, mia, sam, vic] = await Promise.all([
    mk("admin@example.com", "Ada Admin"),
    mk("lee@example.com", "Lee Lead"),
    mk("mia@example.com", "Mia Member"),
    mk("sam@example.com", "Sam Member"),
    mk("vic@example.com", "Vic Viewer"),
  ]);
  const support = await prisma.team.create({ data: { name: "Support" } });
  const payments = await prisma.team.create({ data: { name: "Payments" } });
  const m = (u, t, role) => ({ userId: u.id, teamId: t.id, role });
  await prisma.membership.createMany({
    data: [
      m(admin, support, "ADMIN"), m(admin, payments, "ADMIN"),
      m(lee, support, "LEAD"), m(lee, payments, "MEMBER"),
      m(mia, support, "MEMBER"),
      m(sam, payments, "MEMBER"),
      m(vic, support, "VIEWER"),
    ],
  });

  const people = { [support.id]: [mia, lee], [payments.id]: [sam, lee] };
  for (let i = 0; i < 40; i++) {
    const team = i % 2 === 0 ? support : payments;
    const assignee = i % 3 === 0 ? null : people[team.id][i % 2];
    await prisma.workItem.create({
      data: {
        title: `${TYPES[i % 5].replace("_", " ").toLowerCase()} #${i + 1}`,
        description: `Seeded work item ${i + 1}`,
        type: TYPES[i % 5],
        priority: PRIORITIES[i % 4],
        status: STATUSES[i % 5],
        teamId: team.id,
        assigneeId: assignee?.id ?? null,
        createdById: lee.id,
        dueDate: new Date(Date.now() + (i - 5) * 86400000),
        activities: { create: { actorId: lee.id, type: "CREATED", data: { seeded: true } } },
      },
    });
  }
  console.log("Seeded. Login with any <name>@example.com / password123");
}

main().finally(() => prisma.$disconnect());
