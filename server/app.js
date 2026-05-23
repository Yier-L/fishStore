const express = require("express");
const path = require("node:path");
const { createDb } = require("./db");

function validateContact(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || name.length < 2) {
    return { ok: false, error: "Name must be at least 2 characters." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email must be valid." };
  }

  if (!message || message.length < 10) {
    return { ok: false, error: "Message must be at least 10 characters." };
  }

  return { ok: true, value: { name, email, message } };
}

function validateOrder(body) {
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerName) {
    return { ok: false, error: "Customer name is required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, error: "Customer email must be valid." };
  }

  if (!items.length) {
    return { ok: false, error: "At least one cart item is required." };
  }

  for (const item of items) {
    if (!item || typeof item.id !== "string") {
      return { ok: false, error: "Each item must include a product id." };
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, error: "Each item quantity must be a positive integer." };
    }
  }

  return {
    ok: true,
    value: {
      customerName,
      customerEmail,
      items
    }
  };
}

async function buildApp(options = {}) {
  const app = express();
  const dbPath = options.dbPath || path.join(__dirname, "..", "data", "db.json");
  const db = createDb(dbPath);

  app.use(express.json());
  app.use("/public", express.static(path.join(__dirname, "..", "public")));
  app.use(express.static(path.join(__dirname, "..", "src")));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/products", async (req, res, next) => {
    try {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const products = await db.getProducts(category);
      res.json({ products });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/contact", async (req, res, next) => {
    try {
      const validation = validateContact(req.body || {});
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const saved = await db.saveMessage(validation.value);
      return res.status(201).json({
        message: "Thanks! Your message has been sent.",
        id: saved.id
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/orders", async (req, res, next) => {
    try {
      const validation = validateOrder(req.body || {});
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const resolvedItems = [];
      let subtotal = 0;

      for (const item of validation.value.items) {
        const product = await db.getProductById(item.id);
        if (!product) {
          return res.status(400).json({ error: `Unknown product id: ${item.id}` });
        }

        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;

        resolvedItems.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          lineTotal: Number(lineTotal.toFixed(2))
        });
      }

      const order = await db.createOrder({
        customerName: validation.value.customerName,
        customerEmail: validation.value.customerEmail,
        items: resolvedItems,
        subtotal: Number(subtotal.toFixed(2)),
        status: "received"
      });

      return res.status(201).json({
        id: order.id,
        subtotal: order.subtotal,
        itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
        status: order.status
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "src", "index.html"));
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = {
  buildApp
};
