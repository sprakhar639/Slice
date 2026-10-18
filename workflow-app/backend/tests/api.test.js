import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

// Requires a running, seeded Postgres (docker compose up does this).
const tokens = {};
const as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });
let supportId = 0;
let miaId = 0;

const patch = (who, id, body) => request(app).patch(`/items/${id}`).set(as(who)).send(body);
const listIds = async (who, view) =>
  (await request(app).get(`/items?view=${view}&pageSize=50`).set(as(who))).body.items.map((i) => i.id);

beforeAll(async () => {
  for (const n of ["admin", "lee", "mia", "sam", "vic"]) {
    const r = await request(app).post("/auth/login").send({ email: `${n}@example.com`, password: "password123" });
    tokens[n] = r.body.token;
  }
  miaId = (await request(app).get("/auth/me").set(as("mia"))).body.id;
  supportId = (await request(app).get("/teams").set(as("mia"))).body.find((t) => t.name === "Support").id;
});

describe("health, auth & roles", () => {
  it("exposes a healthy API endpoint", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ok");
  });

  it("rejects missing token and bad password", async () => {
    expect((await request(app).get("/items")).status).toBe(401);
    const r = await request(app).post("/auth/login").send({ email: "mia@example.com", password: "nope" });
    expect(r.status).toBe(401);
  });

  it("viewer cannot create items", async () => {
    const r = await request(app).post("/items").set(as("vic")).send({ title: "x", type: "TASK", teamId: supportId });
    expect(r.status).toBe(403);
  });

  it("user cannot see items of teams they are not in", async () => {
    const items = (await request(app).get("/items?pageSize=50").set(as("sam"))).body.items;
    expect(items.every((i) => i.team.name === "Payments")).toBe(true);
  });
});

describe("workflow", () => {
  it("runs the full lifecycle with approval, history and dashboards", async () => {
    const created = await request(app)
      .post("/items").set(as("mia"))
      .send({ title: "Card declined", type: "PAYMENT", priority: "URGENT", teamId: supportId });
    expect(created.status).toBe(201);
    const id = created.body.id;

    expect(await listIds("mia", "unassigned_urgent")).toContain(id);
    expect((await patch("mia", id, { version: 1, assigneeId: miaId })).body.version).toBe(2);
    expect(await listIds("mia", "assigned")).toContain(id);
    expect(await listIds("mia", "unassigned_urgent")).not.toContain(id);

    expect((await patch("mia", id, { version: 2, status: "RESOLVED" })).status).toBe(400); // invalid jump
    expect((await patch("mia", id, { version: 2, status: "IN_PROGRESS" })).status).toBe(200);
    expect((await patch("mia", id, { version: 3, status: "AWAITING_APPROVAL" })).status).toBe(200);

    expect(await listIds("lee", "awaiting_approval")).toContain(id);
    expect(await listIds("mia", "awaiting_approval")).not.toContain(id);

    expect((await patch("mia", id, { version: 4, status: "RESOLVED" })).status).toBe(403); // member can't approve
    expect((await patch("lee", id, { version: 4, status: "RESOLVED" })).status).toBe(200);
    expect((await patch("lee", id, { version: 5, status: "CLOSED" })).status).toBe(200);
    expect((await patch("lee", id, { version: 6, status: "OPEN" })).status).toBe(400); // closed is final

    const detail = (await request(app).get(`/items/${id}`).set(as("vic"))).body;
    expect(detail.activities.map((a) => a.type)).toEqual([
      "CREATED", "ASSIGNEE_CHANGE", "STATUS_CHANGE", "STATUS_CHANGE", "STATUS_CHANGE", "STATUS_CHANGE",
    ]);
  });

  it("rejects stale versions (409) and logs priority + comments", async () => {
    const id = (await request(app).post("/items").set(as("mia")).send({ title: "Race", type: "TASK", teamId: supportId })).body.id;
    expect((await patch("mia", id, { version: 1, priority: "HIGH" })).status).toBe(200);
    expect((await patch("lee", id, { version: 1, priority: "LOW" })).status).toBe(409);
    expect((await request(app).post(`/items/${id}/comments`).set(as("vic")).send({ body: "hi" })).status).toBe(403);
    expect((await request(app).post(`/items/${id}/comments`).set(as("lee")).send({ body: "looking" })).status).toBe(201);
    const types = (await request(app).get(`/items/${id}`).set(as("lee"))).body.activities.map((a) => a.type);
    expect(types).toEqual(["CREATED", "PRIORITY_CHANGE", "COMMENT"]);
  });

  it("supports search and pagination", async () => {
    const r = await request(app).get("/items?q=payment&pageSize=2&page=1").set(as("admin"));
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBeLessThanOrEqual(2);
    expect(r.body.total).toBeGreaterThan(0);
  });
});
