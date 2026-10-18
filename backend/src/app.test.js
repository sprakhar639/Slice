import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

describe("Health endpoint", () => {
it("returns 200 when the API is running", async () => {
const response = await request(app).get("/health");


expect(response.status).toBe(200);
expect(response.body.data.status).toBe("ok");


});

it("returns 404 for an unknown route", async () => {
const response = await request(app).get("/invalid");


expect(response.status).toBe(404);

});
});
