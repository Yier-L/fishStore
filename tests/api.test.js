const fs = require("node:fs/promises");
const path = require("node:path");
const request = require("supertest");
const { beforeEach, describe, expect, it } = require("vitest");
const { buildApp } = require("../server/app");

const tempDbPath = path.join(__dirname, "tmp-db.json");

const seed = {
  products: [
    {
      id: "fish-neon-tetra-6",
      name: "Neon Tetra (Group of 6)",
      description: "seed",
      price: 18.99,
      category: "fish",
      image: "img",
      alt: "alt"
    },
    {
      id: "plant-guppy-grass",
      name: "Guppy Grass",
      description: "seed",
      price: 4.99,
      category: "plants",
      image: "img",
      alt: "alt"
    }
  ],
  messages: [],
  orders: []
};

let app;

beforeEach(async () => {
  await fs.writeFile(tempDbPath, JSON.stringify(seed, null, 2), "utf8");
  app = await buildApp({ dbPath: tempDbPath });
});

describe("AquaBloom API", () => {
  it("returns filtered products by category", async () => {
    const response = await request(app).get("/api/products").query({ category: "plants" });

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].id).toBe("plant-guppy-grass");
  });

  it("validates contact submissions", async () => {
    const bad = await request(app).post("/api/contact").send({
      name: "A",
      email: "not-an-email",
      message: "short"
    });

    expect(bad.status).toBe(400);

    const good = await request(app).post("/api/contact").send({
      name: "Alex Rivers",
      email: "alex@example.com",
      message: "I need advice for a beginner planted tank setup."
    });

    expect(good.status).toBe(201);
    expect(good.body.message).toMatch(/Thanks/i);
  });

  it("creates an order with server-calculated totals", async () => {
    const response = await request(app).post("/api/orders").send({
      customerName: "Jamie Stone",
      customerEmail: "jamie@example.com",
      items: [
        { id: "fish-neon-tetra-6", quantity: 2 },
        { id: "plant-guppy-grass", quantity: 1 }
      ]
    });

    expect(response.status).toBe(201);
    expect(response.body.itemCount).toBe(3);
    expect(response.body.subtotal).toBeCloseTo(42.97, 2);
  });
});
