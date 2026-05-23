const state = {
	catalog: {
		fish: [],
		plants: [],
		supplies: []
	},
	byId: new Map(),
	byName: new Map(),
	catalogError: false
};

const cart = new Map();
const CART_STORAGE_KEY = "aquabloom-cart-v2";

function setStatus(el, text, isError) {
	if (!(el instanceof HTMLElement)) {
		return;
	}

	el.textContent = text;
	el.classList.toggle("error", Boolean(isError));
}

function createEl(tag, className, text) {
	const el = document.createElement(tag);
	if (className) {
		el.className = className;
	}
	if (typeof text === "string") {
		el.textContent = text;
	}
	return el;
}

async function fetchCatalog() {
	const response = await fetch("/api/products");
	if (!response.ok) {
		throw new Error("Could not load products");
	}

	const payload = await response.json();
	const products = Array.isArray(payload.products) ? payload.products : [];

	state.catalog = { fish: [], plants: [], supplies: [] };
	state.catalogError = false;
	state.byId.clear();
	state.byName.clear();

	products.forEach((product) => {
		if (!product || typeof product.id !== "string" || typeof product.name !== "string") {
			return;
		}

		const category = product.category === "plants" || product.category === "supplies" ? product.category : "fish";
		state.catalog[category].push(product);
		state.byId.set(product.id, product);
		state.byName.set(product.name.toLowerCase(), product);
	});
}

function saveCart() {
	const serialized = JSON.stringify(Array.from(cart.values()));
	localStorage.setItem(CART_STORAGE_KEY, serialized);
}

function readStoredCart() {
	const raw = localStorage.getItem(CART_STORAGE_KEY);
	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed;
		}
	} catch {
		localStorage.removeItem(CART_STORAGE_KEY);
	}

	return [];
}

function hydrateCart(storedItems) {
	cart.clear();

	storedItems.forEach((item) => {
		const quantity = Number(item.quantity);
		if (!Number.isInteger(quantity) || quantity < 1) {
			return;
		}

		let product = null;
		if (typeof item.id === "string") {
			product = state.byId.get(item.id) || null;
		}

		if (!product && typeof item.name === "string") {
			product = state.byName.get(item.name.toLowerCase()) || null;
		}

		if (!product) {
			return;
		}

		cart.set(product.id, {
			id: product.id,
			name: product.name,
			price: product.price,
			quantity
		});
	});
}

function createCard(item) {
	const card = createEl("li", "listing-card");

	const img = createEl("img", "listing-img");
	img.src = item.image;
	img.alt = item.alt;

	const name = createEl("h3", "item-name", item.name);
	const description = createEl("p", "item-desc", item.description);

	const row = createEl("div", "item-purchase-row");
	const price = createEl("p", "item-price", `$${item.price.toFixed(2)}`);

	const button = createEl("button", "add-btn", "Add to Cart");
	button.type = "button";
	button.dataset.id = item.id;

	row.append(price, button);
	card.append(img, name, description, row);
	return card;
}

function renderCatalog() {
	const sectionMap = [
		{ key: "fish", elementId: "fishList" },
		{ key: "plants", elementId: "plantsList" },
		{ key: "supplies", elementId: "suppliesList" }
	];

	sectionMap.forEach(({ key, elementId }) => {
		const container = document.getElementById(elementId);
		if (!container) {
			return;
		}

		container.textContent = "";

		if (state.catalogError) {
			container.appendChild(createEl("li", "catalog-error", "Could not load products. Please try refreshing the page."));
			return;
		}

		if (state.catalog[key].length === 0) {
			container.appendChild(createEl("li", "catalog-empty", "No products found."));
			return;
		}

		state.catalog[key].forEach((item) => {
			container.appendChild(createCard(item));
		});
	});
}

function updateCartUI() {
	const cartItemsEl = document.getElementById("cartItems");
	const cartCountEl = document.getElementById("cartCount");
	const navCartCountEl = document.getElementById("navCartCount");
	const cartSubtotalEl = document.getElementById("cartSubtotal");

	let totalCount = 0;
	let subtotal = 0;

	if (cartItemsEl) {
		cartItemsEl.textContent = "";
	}

	cart.forEach((entry) => {
		const lineTotal = entry.price * entry.quantity;
		totalCount += entry.quantity;
		subtotal += lineTotal;

		if (cartItemsEl) {
			const row = createEl("li", "cart-item-row");
			const name = createEl("span", "", entry.name);
			const qty = createEl("span", "", `Qty: ${entry.quantity}`);
			const total = createEl("span", "", `$${lineTotal.toFixed(2)}`);

			const remove = createEl("button", "remove-btn", "Remove");
			remove.type = "button";
			remove.dataset.id = entry.id;

			row.append(name, qty, total, remove);
			cartItemsEl.appendChild(row);
		}
	});

	if (cartItemsEl && cart.size === 0) {
		cartItemsEl.appendChild(createEl("li", "cart-empty", "Your cart is empty."));
	}

	if (cartCountEl) {
		cartCountEl.textContent = String(totalCount);
	}

	if (navCartCountEl) {
		navCartCountEl.textContent = String(totalCount);
	}

	if (cartSubtotalEl) {
		cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
	}
}

function addToCartByProduct(product) {
	const existing = cart.get(product.id);
	if (existing) {
		existing.quantity += 1;
	} else {
		cart.set(product.id, {
			id: product.id,
			name: product.name,
			price: product.price,
			quantity: 1
		});
	}

	saveCart();
	updateCartUI();
}

function removeFromCart(productId) {
	if (!cart.has(productId)) {
		return;
	}

	cart.delete(productId);
	saveCart();
	updateCartUI();
}

function setupCartHandlers() {
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}

		if (target.classList.contains("add-btn")) {
			const id = target.dataset.id;
			const name = target.dataset.name;
			const byId = typeof id === "string" ? state.byId.get(id) : null;
			const byName = typeof name === "string" ? state.byName.get(name.toLowerCase()) : null;
			const product = byId || byName || null;

			if (product) {
				addToCartByProduct(product);
			}
		}

		if (target.id === "clearCartBtn") {
			cart.clear();
			saveCart();
			updateCartUI();
		}

		if (target.classList.contains("remove-btn") && target.dataset.id) {
			removeFromCart(target.dataset.id);
		}
	});
}

function setupContactForm() {
	const form = document.getElementById("contactForm");
	const status = document.getElementById("formStatus");
	const nameInput = document.getElementById("name");
	const emailInput = document.getElementById("email");
	const messageInput = document.getElementById("message");

	if (
		!(form instanceof HTMLFormElement) ||
		!(status instanceof HTMLElement) ||
		!(nameInput instanceof HTMLInputElement) ||
		!(emailInput instanceof HTMLInputElement) ||
		!(messageInput instanceof HTMLTextAreaElement)
	) {
		return;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		const payload = {
			name: nameInput.value,
			email: emailInput.value,
			message: messageInput.value
		};

		if (!form.checkValidity()) {
			setStatus(status, "Please fill out all required fields with valid information.", true);
			return;
		}

		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				setStatus(status, body.error || "Could not send message right now.", true);
				return;
			}

			setStatus(status, "Thanks! Your message has been sent.", false);
			form.reset();
		} catch {
			setStatus(status, "Network error. Please try again.", true);
		}
	});
}

function getOrderItemsFromCart() {
	return Array.from(cart.values()).map((item) => ({
		id: item.id,
		quantity: item.quantity
	}));
}

function setupCheckoutForm() {
	const form = document.getElementById("checkoutForm");
	const status = document.getElementById("checkoutStatus");
	const nameInput = document.getElementById("checkoutName");
	const emailInput = document.getElementById("checkoutEmail");

	if (
		!(form instanceof HTMLFormElement) ||
		!(status instanceof HTMLElement) ||
		!(nameInput instanceof HTMLInputElement) ||
		!(emailInput instanceof HTMLInputElement)
	) {
		return;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		if (cart.size === 0) {
			setStatus(status, "Your cart is empty.", true);
			return;
		}

		if (!form.checkValidity()) {
			setStatus(status, "Please provide your name and a valid email.", true);
			return;
		}

		const payload = {
			customerName: nameInput.value,
			customerEmail: emailInput.value,
			items: getOrderItemsFromCart()
		};

		try {
			const response = await fetch("/api/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});

			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				setStatus(status, body.error || "Could not place order.", true);
				return;
			}

			setStatus(status, `Order ${body.id} received. Total: $${Number(body.subtotal).toFixed(2)}.`, false);
			cart.clear();
			saveCart();
			updateCartUI();
			form.reset();
		} catch {
			setStatus(status, "Network error. Please try again.", true);
		}
	});
}

async function init() {
	const stored = readStoredCart();

	try {
		await fetchCatalog();
	} catch {
		console.error("Failed to load catalog from API.");
		state.catalogError = true;
	}

	hydrateCart(stored);
	renderCatalog();
	updateCartUI();
	setupCartHandlers();
	setupContactForm();
	setupCheckoutForm();
}

init();
