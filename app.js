(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const CATALOG_URL = "/matcha-manita-sku-catalog-v1.json";

  const SUPABASE_URL =
    "https://xbzxzdcfrhsxrqlpqzdw.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_oWYpTQefSN2J22urpPSYng_JGk-6_hM";

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  let products = [];
  let active = "All";
  let cart = [];
  // Keep preview bags across reloads. Validate against the approved catalog on load.
  const CART_STORAGE_KEY = "mm-preview-cart-v1";
  function saveCart() {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); }
    catch (_) { /* Storage may be unavailable in private mode. */ }
  }
  function restoreCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) {
        cart = [];
        saveCart();
        return;
      }
      const bySku = new Map();
      for (const item of stored) {
        if (!item || typeof item.sku !== "string" ||
            !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 99) continue;
        const match = findSku(item.sku);
        if (!match || match.variant.available === false) continue;
        bySku.set(item.sku, Math.min(99, (bySku.get(item.sku) || 0) + item.qty));
      }
      cart = [...bySku].map(([sku, qty]) => ({ sku, qty }));
      saveCart();
    } catch (_) {
      cart = [];
      saveCart();
    }
  }
  const favorites = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem("mm-favorites-v1") || "[]");
    if (Array.isArray(saved)) saved.filter(id => typeof id === "string").forEach(id => favorites.add(id));
  } catch (_) { /* Private browsing can disable storage. */ }
  function toggleFavorite(id) {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    try { localStorage.setItem("mm-favorites-v1", JSON.stringify([...favorites])); } catch (_) {}
    render();
  }

  let accessToken = "";
  let orderSession = null;
  let checkoutInFlight = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function variantLabel(variant) {
    return (
      variant.weight ||
      variant.size ||
      variant.label ||
      variant.sku
    );
  }

  function findSku(sku) {
    for (const product of products) {
      const variant =
        product.variants?.find(
          item => item.sku === sku
        );

      if (variant) {
        return {
          product,
          variant
        };
      }
    }

    return null;
  }

  function startingPriceMinor(product) {
    const prices =
      (product.variants || [])
        .filter(
          variant =>
            variant.available !== false &&
            Number.isInteger(
              variant.priceMinor
            )
        )
        .map(
          variant => variant.priceMinor
        );

    if (!prices.length) {
      return 0;
    }

    return Math.min(...prices);
  }

  function validateCatalog(catalog) {
    if (
      !catalog ||
      catalog.registryId !==
        "matcha-manita-sku-catalog-v1" ||
      !Array.isArray(catalog.products)
    ) {
      throw new Error(
        "MATCHA MANITA catalog is invalid."
      );
    }

    // Approved flower price contract: fail closed if catalog prices drift.
    const flowerPrices = new Map([
      [1, 286], [3.5, 1000], [7, 2000], [14, 4000], [28, 8000]
    ]);
    const flowerWeights = new Map([
      ["1g", 1], ["1/8 oz", 3.5], ["1/4 oz", 7],
      ["1/2 oz", 14], ["1 oz", 28]
    ]);

    const seen = new Set();
    const productIds = new Set();

    catalog.products.forEach(product => {
      if (
        !product.id ||
        !product.name ||
        !product.category ||
        !Array.isArray(product.variants)
      ) {
        throw new Error(
          "Catalog contains an invalid product."
        );
      }

      if (typeof product.id !== "string" || productIds.has(product.id)) {
        throw new Error("Catalog contains a duplicate or invalid product ID.");
      }
      productIds.add(product.id);

      product.variants.forEach(variant => {
        if (typeof variant.sku !== "string" || !variant.sku.trim()) {
          throw new Error(
            `Missing SKU for ${product.id}.`
          );
        }

        if (seen.has(variant.sku)) {
          throw new Error(
            `Duplicate SKU: ${variant.sku}`
          );
        }

        seen.add(variant.sku);

        if (product.category === "Flower") {
          const grams = Number.isFinite(variant.grams)
            ? variant.grams
            : flowerWeights.get(variant.weight);
          if (!flowerPrices.has(grams) ||
              variant.priceMinor !== flowerPrices.get(grams)) {
            throw new Error(`Unapproved flower weight or price: ${variant.sku}`);
          }
        }

        if (
          !Number.isInteger(
            variant.priceMinor
          ) ||
          variant.priceMinor < 0
        ) {
          throw new Error(
            `Invalid price for ${variant.sku}.`
          );
        }
      });
    });

    return catalog;
  }

  async function loadCatalog() {
    const response =
      await fetch(
        CATALOG_URL,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `Catalog request failed (${response.status}).`
      );
    }

    const catalog =
      validateCatalog(
        await response.json()
      );

    products =
      catalog.products.map(
        (product, featured) => ({
          ...product,
          featured
        })
      );

    return catalog;
  }

  function cats() {
    const host = $("categories");

    if (!host) {
      return;
    }

    host.innerHTML = "";

    // Show all approved categories even before licensed inventory is synced.
    const storefrontCategories = [
      "Flower", "Pre-Rolls", "Concentrates", "Diamonds",
      "Vapes", "Edibles", "Beverages", "Topicals",
      "Wellness", "Accessories"
    ];
    const categories = [
      "All", "Favorites",
      ...new Set([
        ...storefrontCategories,
        ...products.map(product => product.category)
      ])
    ];

    categories.forEach(category => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        category === active
          ? "category active"
          : "category";

      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === active));

      button.onclick = () => {
        active = category;
        cats();
        render();
      };

      host.appendChild(button);
    });
  }

  function list() {
    const query =
      ($("search")?.value || "")
        .trim()
        .toLowerCase();

    const sort =
      $("sort")?.value || "featured";

    const items =
      products.filter(product => {
        const matchesCategory =
          active === "All" ||
          (active === "Favorites" && favorites.has(product.id)) ||
          product.category === active;

        const matchesSearch =
          !query ||
          `${product.name} ${product.category}`
            .toLowerCase()
            .includes(query);

        return (
          matchesCategory &&
          matchesSearch
        );
      });

    if (sort === "low") {
      items.sort(
        (a, b) =>
          startingPriceMinor(a) -
          startingPriceMinor(b)
      );
    }

    if (sort === "high") {
      items.sort(
        (a, b) =>
          startingPriceMinor(b) -
          startingPriceMinor(a)
      );
    }

    if (sort === "featured") {
      items.sort(
        (a, b) =>
          a.featured - b.featured
      );
    }

    return items;
  }

  function render() {
    const grid = $("productGrid");

    if (!grid) {
      return;
    }

    grid.innerHTML = "";

    const items = list();
    const results = $("catalogResults");
    if (results) results.textContent = `${items.length} preview product${items.length === 1 ? "" : "s"} found`;
    grid.setAttribute("aria-live", "polite");
    grid.setAttribute("aria-label", `${items.length} matching products`);

    if (!items.length) {
      const searching = Boolean(($("search")?.value || "").trim());
      const message = searching
        ? "No matching preview products. Try another search or category."
        : active === "Favorites"
          ? "No favorites yet. Use the heart on a product to save it here."
          : active === "All"
            ? "Preview catalog is currently unavailable. Please check back."
            : `${active} collection preview — inventory and availability have not been verified.`;
      const notice = document.createElement("p");
      notice.className = "empty";
      notice.setAttribute("role", "status");
      notice.textContent = message;
      grid.appendChild(notice);
      return;
    }

    items.forEach(product => {
      const card =
        document.createElement("article");

      card.className =
        "product-card";

      const available =
        (product.variants || [])
          .filter(
            variant =>
              variant.available !== false
          );

      const variantButtons =
        available.length
          ? available
              .map(variant => {
                const sku =
                  escapeHtml(
                    variant.sku
                  );

                const label =
                  escapeHtml(
                    variantLabel(
                      variant
                    )
                  );

                const price =
                  money.format(
                    variant.priceMinor /
                      100
                  );

                return `
                  <button
                    type="button"
                    data-sku="${sku}"
                    class="variant-button"
                  >
                    <span>${label}</span>
                    <strong>${price}</strong>
                  </button>
                `;
              })
              .join("")
          : `
              <button
                type="button"
                class="variant-button"
                disabled
              >
                Unavailable
              </button>
            `;

      const isFavorite = favorites.has(product.id);
      card.innerHTML = `
        <button type="button" class="mm-favorite" aria-label="${isFavorite ? "Remove" : "Add"} ${escapeHtml(product.name)} ${isFavorite ? "from" : "to"} favorites" aria-pressed="${isFavorite}" data-favorite="${escapeHtml(product.id)}">${isFavorite ? "♥" : "♡"}</button>
        <div
          class="product-art"
          aria-hidden="true"
        >
          <span>MM</span>
        </div>

        <small>
          ${escapeHtml(
            product.category
          )}
        </small>

        <h3>
          ${escapeHtml(
            product.name
          )}
        </h3>

        <div class="product-bottom">
          <strong>
            ${available.length
              ? `From ${money.format(startingPriceMinor(product) / 100)}`
              : "Price unavailable"}
          </strong>
        </div>

        <p class="mm-card-availability" role="note">Preview listing · Inventory not confirmed</p>
        <div class="variant-list" aria-label="Select weight or size for ${escapeHtml(product.name)}">
          ${variantButtons}
        </div>
      `;

      card.querySelector("[data-favorite]")?.addEventListener("click", () => toggleFavorite(product.id));
      card
        .querySelectorAll(
          "[data-sku]"
        )
        .forEach(button => {
          button.onclick = () => {
            add(
              button.dataset.sku
            );
          };
        });

      grid.appendChild(card);
    });
  }

  function add(sku) {
    const match = findSku(sku);

    if (
      !match ||
      match.variant.available === false
    ) {
      return;
    }

    // A preview bag is not a verified order or a stock reservation.
    // Only catalog-priced, non-negative integer-cent variants can be added.
    if (!Number.isSafeInteger(match.variant.priceMinor) ||
        match.variant.priceMinor <= 0) {
      return;
    }

    const existing =
      cart.find(
        item => item.sku === sku
      );

    if (existing) {
      existing.qty = Math.min(99, existing.qty + 1);
    } else {
      cart.push({
        sku,
        qty: 1
      });
    }

    saveCart();
    bag();
  }

  function qty(sku, change) {
    const item =
      cart.find(
        entry =>
          entry.sku === sku
      );

    if (!item) {
      return;
    }

    item.qty = Math.min(99, item.qty + change);

    cart =
      cart.filter(
        entry => entry.qty > 0
      );

    saveCart();
    bag();
  }

  function cartAmountMinor() {
    return cart.reduce(
      (sum, item) => {
        const match =
          findSku(item.sku);

        if (
          !match ||
          match.variant
            .available === false
        ) {
          return sum;
        }

        return (
          sum +
          match.variant.priceMinor *
            item.qty
        );
      },
      0
    );
  }

  function validateCart() {
    for (const item of cart) {
      const match =
        findSku(item.sku);

      if (!match) {
        throw new Error(
          `Unknown SKU in cart: ${item.sku}`
        );
      }

      if (
        match.variant.available ===
        false
      ) {
        throw new Error(
          `${match.product.name} ${variantLabel(
            match.variant
          )} is unavailable.`
        );
      }

      if (
        !Number.isInteger(
          match.variant.priceMinor
        ) ||
        match.variant.priceMinor <= 0
      ) {
        throw new Error(
          `Invalid price for ${item.sku}.`
        );
      }

      if (
        !Number.isInteger(item.qty) ||
        item.qty <= 0
      ) {
        throw new Error(
          `Invalid quantity for ${item.sku}.`
        );
      }
    }
  }

  function bag() {
    const host = $("cartItems");
    const count = $("cartCount");
    const total = $("cartTotal");

    if (
      !host ||
      !count ||
      !total
    ) {
      return;
    }

    count.textContent =
      String(
        cart.reduce(
          (sum, item) =>
            sum + item.qty,
          0
        )
      );

    total.textContent =
      money.format(
        cartAmountMinor() / 100
      );

    host.innerHTML = "";

    if (!cart.length) {
      host.innerHTML =
        '<p class="empty">Your bag is empty.</p>';

      return;
    }

    cart.forEach(item => {
      const match =
        findSku(item.sku);

      if (!match) {
        return;
      }

      const {
        product,
        variant
      } = match;

      const row =
        document.createElement("div");

      row.className =
        "cart-row";

      row.innerHTML = `
        <div>
          <b>
            ${escapeHtml(
              product.name
            )}
          </b>

          <small>
            ${escapeHtml(
              variantLabel(
                variant
              )
            )}
            ·
            ${money.format(
              variant.priceMinor /
                100
            )}
            each
          </small>
        </div>

        <div class="qty">
          <button
            type="button"
            aria-label="Remove one"
          >
            −
          </button>

          <span>
            ${item.qty}
          </span>

          <button
            type="button"
            aria-label="Add one"
          >
            +
          </button>
        </div>
      `;

      const buttons =
        row.querySelectorAll(
          "button"
        );

      buttons[0].onclick =
        () =>
          qty(
            item.sku,
            -1
          );

      buttons[1].onclick =
        () =>
          qty(
            item.sku,
            1
          );

      host.appendChild(row);
    });
  }

  function drawer(open) {
    $("drawer")
      ?.classList.toggle(
        "open",
        open
      );

    $("scrim")
      ?.classList.toggle(
        "show",
        open
      );

    document.body
      .classList.toggle(
        "drawer-open",
        open
      );
  }

  async function signIn(
    email,
    password
  ) {
    const authResponse =
      await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              email,
              password
            })
        }
      );

    const authBody =
      await authResponse
        .json()
        .catch(() => ({}));

    if (
      !authResponse.ok ||
      !authBody.access_token
    ) {
      throw new Error(
        authBody.error_description ||
        authBody.msg ||
        "Sign in failed."
      );
    }

    const sessionResponse =
      await fetch(
        "/.netlify/functions/create-order-session",
        {
          method: "POST",

          headers: {
            authorization:
              `Bearer ${authBody.access_token}`,

            "content-type":
              "application/json"
          },

          body: "{}"
        }
      );

    const sessionBody =
      await sessionResponse
        .json()
        .catch(() => ({}));

    if (
      !sessionResponse.ok ||
      !sessionBody.ok ||
      !sessionBody.customerId ||
      !sessionBody.orderId ||
      !sessionBody.ownershipProof
    ) {
      throw new Error(
        sessionBody.error ||
        "Customer session could not be verified."
      );
    }

    accessToken =
      authBody.access_token;

    orderSession = {
      orderId:
        sessionBody.orderId,

      customerId:
        sessionBody.customerId,

      ownershipProof:
        sessionBody.ownershipProof
    };

    return sessionBody;
  }

  $("enterBtn")
    ?.addEventListener(
      "click",
      () => {
        $("ageGate")
          ?.classList.add(
            "hidden"
          );
      }
    );

  $("leaveBtn")
    ?.addEventListener(
      "click",
      () => {
        const gate =
          $("ageGate");

        if (gate) {
          gate
            .querySelector(
              ".age-card"
            )
            .innerHTML =
              "<h2>Access unavailable</h2><p>This storefront is intended for adults 21+.</p>";
        }
      }
    );

  $("menuBtn")
    ?.addEventListener(
      "click",
      () => {
        $("nav")
          ?.classList.toggle(
            "open"
          );
      }
    );

  document
    .querySelectorAll(
      "#nav a"
    )
    .forEach(link => {
      link.onclick =
        () => {
          $("nav")
            ?.classList.remove(
              "open"
            );
        };
    });

  $("cartBtn")
    ?.addEventListener(
      "click",
      () => drawer(true)
    );

  $("closeCart")
    ?.addEventListener(
      "click",
      () => drawer(false)
    );

  $("scrim")
    ?.addEventListener(
      "click",
      () => drawer(false)
    );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Escape"
      ) {
        drawer(false);
      }
    }
  );

  $("search")
    ?.addEventListener(
      "input",
      render
    );

  $("sort")
    ?.addEventListener(
      "change",
      render
    );

  $("zipForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const zip =
          ($("zip")?.value || "")
            .trim();

        $("zipStatus")
          .textContent =
            /^\d{5}$/.test(zip)
              ? "ZIP received. Final delivery eligibility must be confirmed by the licensed fulfillment workflow."
              : "Enter a valid 5-digit ZIP code.";
      }
    );

  // Account creation uses the Supabase Auth endpoint, not the unverified
  // customer application form. Never send DOB, phone, or medical data here.
  $("signupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const email = ($("signupEmail")?.value || "").trim();
    const password = $("signupPassword")?.value || "";
    const confirm = $("signupConfirm")?.value || "";
    const status = $("signupStatus");
    const button = form.querySelector('button[type="submit"]');
    if (password !== confirm) {
      if (status) status.textContent = "Passwords do not match.";
      return;
    }
    if (status) status.textContent = "Creating account…";
    if (button) button.disabled = true;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.msg || body.error_description || body.message || "Account creation failed.");
      if (status) status.textContent = "Registration request accepted. Check your email for confirmation if required by the authentication provider. Your identity and delivery eligibility are not yet verified.";
      if ($("signupPassword")) $("signupPassword").value = "";
      if ($("signupConfirm")) $("signupConfirm").value = "";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : "Account creation failed.";
    } finally {
      if (button) button.disabled = false;
    }
  });

  $("recoveryForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const status = $("recoveryStatus");
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    status.textContent = "Sending recovery request…";
    try {
      const response = await fetch(SUPABASE_URL + "/auth/v1/recover", {
        method: "POST",
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
        body: JSON.stringify({ email: $("recoveryEmail").value.trim() })
      });
      status.textContent = response.ok
        ? "If this email is registered, recovery instructions will be sent."
        : "Recovery is unavailable right now. Try again later.";
    } catch (_) {
      status.textContent = "Recovery is unavailable right now. Try again later.";
    } finally {
      button.disabled = false;
    }
  });

  $("applyForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        if (
          !event.currentTarget
            .reportValidity()
        ) {
          return;
        }

        $("applyStatus")
          .textContent =
            "Application validated locally. Secure account submission is not enabled in this frontend build.";
      }
    );

  // Browser capability check only: never collect biometric templates or request credentials
  // until a verified, server-issued WebAuthn challenge endpoint is configured.
  $("passkeyInfoBtn")?.addEventListener("click", () => {
    const supported = window.isSecureContext &&
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof navigator.credentials?.get === "function";
    const status = $("passkeyStatus");
    if (status) status.textContent = supported
      ? "Your browser supports passkeys. Sign-in is not enabled until secure server verification is connected."
      : "Passkeys require a compatible browser and a secure HTTPS connection. Sign-in is not enabled.";
  });

  $("loginForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        if (
          !event.currentTarget
            .reportValidity()
        ) {
          return;
        }

        const status =
          $("loginStatus");

        const submit =
          event.currentTarget
            .querySelector(
              'button[type="submit"], button:not([type])'
            );

        const email =
          ($("loginEmail")
            ?.value || "")
            .trim();

        const password =
          $("loginPassword")
            ?.value || "";

        if (status) {
          status.textContent =
            "Signing in securely…";
        }

        if (submit) {
          submit.disabled =
            true;
        }

        try {
          const session =
            await signIn(
              email,
              password
            );

          if (status) {
            status.textContent =
              `Signed in. Customer session verified: ${session.customerId.slice(
                0,
                8
              )}…`;
          }

          $("loginPassword")
            .value = "";
        } catch (error) {
          accessToken = "";
          orderSession = null;

          if (status) {
            status.textContent =
              error instanceof Error
                ? error.message
                : "Sign in failed.";
          }
        } finally {
          if (submit) {
            submit.disabled =
              false;
          }
        }
      }
    );

  $("resetCatalog")?.addEventListener("click", () => {
    active = "All";
    if ($("search")) $("search").value = "";
    if ($("sort")) $("sort").value = "featured";
    cats();
    render();
    $("search")?.focus();
  });

  // Preview safeguard: do not start payment, checkout or order fulfillment.
  const checkoutButton = $("checkoutBtn");
  if (checkoutButton) {
    checkoutButton.disabled = true;
    checkoutButton.addEventListener("click", event => {
      event.preventDefault();
      const status = $("checkoutStatus");
      if (status) status.textContent =
        "Checkout is disabled in this research preview. Licensed fulfillment and identity verification are required.";
    });
  }

  loadCatalog().then(() => {
    restoreCart();
    bag();
    cats();
    render();
  }).catch(error => {
    const status = $("checkoutStatus");
    if (status) status.textContent = "Catalog preview unavailable. Please retry later.";
    console.error("Matcha Manita catalog load failed", error);
  });
})();
