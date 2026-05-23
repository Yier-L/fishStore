const fs = require("node:fs/promises");
const path = require("node:path");

const defaultState = {
  products: [],
  messages: [],
  orders: []
};

async function ensureDbFile(dbPath) {
  const folder = path.dirname(dbPath);
  await fs.mkdir(folder, { recursive: true });

  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

async function readState(dbPath) {
  await ensureDbFile(dbPath);
  const raw = await fs.readFile(dbPath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : []
    };
  } catch {
    return { ...defaultState };
  }
}

async function writeState(dbPath, state) {
  await fs.writeFile(dbPath, JSON.stringify(state, null, 2), "utf8");
}

function createDb(dbPath) {
  return {
    async getProducts(category) {
      const state = await readState(dbPath);
      if (!category) {
        return state.products;
      }
      return state.products.filter((product) => product.category === category);
    },

    async getProductById(id) {
      const state = await readState(dbPath);
      return state.products.find((product) => product.id === id) || null;
    },

    async getProductByName(name) {
      const state = await readState(dbPath);
      return state.products.find((product) => product.name === name) || null;
    },

    async saveMessage(message) {
      const state = await readState(dbPath);
      const newMessage = {
        id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        ...message
      };

      state.messages.push(newMessage);
      await writeState(dbPath, state);
      return newMessage;
    },

    async createOrder(orderPayload) {
      const state = await readState(dbPath);
      const newOrder = {
        id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        ...orderPayload
      };

      state.orders.push(newOrder);
      await writeState(dbPath, state);
      return newOrder;
    }
  };
}

module.exports = {
  createDb
};
