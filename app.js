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

    const seen = new Set();

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

      product.variants.forEach(variant => {
        if (!variant.sku) {
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

    const categories = [
      "All",
      ...new Set(
        products.map(
          product => product.category
        )
      )
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

    if (!items.length) {
      grid.innerHTML =
        '<p class="empty">No products match this view.</p>';

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

      card.innerHTML = `
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
            From ${money.format(
              startingPriceMinor(
                product
              ) / 100
            )}
          </strong>
        </div>

        <div class="variant-list">
          ${variantButtons}
        </div>
      `;

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

    const existing =
      cart.find(
        item => item.sku === sku
      );

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        sku,
        qty: 1
      });
    }

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

    item.qty += change;

    cart =
      cart.filter(
        entry => entry.qty > 0
      );

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

  loadCatalog().catch(error => {
    const status = $("checkoutStatus");
    if (status) status.textContent = "Catalog preview unavailable. Please retry later.";
    console.error("Matcha Manita catalog load failed", error);
  });
})();
