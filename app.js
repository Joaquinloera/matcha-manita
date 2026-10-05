(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  const SUPABASE_URL =
    "https://xbzxzdcfrhsxrqlpqzdw.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_oWYpTQefSN2J22urpPSYng_JGk-6_hM";

  const products = [
    ["mm-01", "Emerald Collection", "Flower", 42],
    ["mm-02", "Purple Orbit", "Flower", 48],
    ["mm-03", "Golden Moon", "Concentrates", 38],
    ["mm-04", "Diamond Drop", "Concentrates", 52],
    ["mm-05", "Cosmic Chews", "Edibles", 24],
    ["mm-06", "Hive Vape", "Vapes", 36]
  ].map(([id, name, category, price], i) => ({
    id,
    name,
    category,
    price,
    featured: i
  }));

  let active = "All";
  let cart = [];
  let accessToken = "";

  function cats() {
    const host = $("categories");
    if (!host) return;

    host.innerHTML = "";

    ["All", ...new Set(products.map(p => p.category))]
      .forEach(category => {
        const button = document.createElement("button");

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

    let items = products.filter(product =>
      (active === "All" ||
        product.category === active) &&
      (!query ||
        `${product.name} ${product.category}`
          .toLowerCase()
          .includes(query))
    );

    if (sort === "low")
      items.sort((a, b) => a.price - b.price);

    if (sort === "high")
      items.sort((a, b) => b.price - a.price);

    if (sort === "featured")
      items.sort(
        (a, b) => a.featured - b.featured
      );

    return items;
  }

  function render() {
    const grid = $("productGrid");
    if (!grid) return;

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

      card.className = "product-card";

      card.innerHTML = `
        <div class="product-art" aria-hidden="true">
          <span>MM</span>
        </div>

        <small>${product.category}</small>
        <h3>${product.name}</h3>

        <div class="product-bottom">
          <strong>${money.format(product.price)}</strong>
          <button type="button">Add to Bag</button>
        </div>
      `;

      card.querySelector("button").onclick =
        () => add(product.id);

      grid.appendChild(card);
    });
  }

  function add(id) {
    const item =
      cart.find(entry => entry.id === id);

    if (item) {
      item.qty++;
    } else {
      cart.push({ id, qty: 1 });
    }

    bag();
  }

  function qty(id, change) {
    const item =
      cart.find(entry => entry.id === id);

    if (!item) return;

    item.qty += change;

    cart =
      cart.filter(entry => entry.qty > 0);

    bag();
  }

  function bag() {
    const itemsHost = $("cartItems");
    const count = $("cartCount");
    const total = $("cartTotal");

    if (!itemsHost || !count || !total)
      return;

    count.textContent = String(
      cart.reduce(
        (sum, item) => sum + item.qty,
        0
      )
    );

    total.textContent = money.format(
      cart.reduce((sum, item) => {
        const product =
          products.find(
            p => p.id === item.id
          );

        return sum +
          (product
            ? product.price * item.qty
            : 0);
      }, 0)
    );

    itemsHost.innerHTML = "";

    if (!cart.length) {
      itemsHost.innerHTML =
        '<p class="empty">Your bag is empty.</p>';
      return;
    }

    cart.forEach(item => {
      const product =
        products.find(
          p => p.id === item.id
        );

      if (!product) return;

      const row =
        document.createElement("div");

      row.className = "cart-row";

      row.innerHTML = `
        <div>
          <b>${product.name}</b>
          <small>
            ${money.format(product.price)} each
          </small>
        </div>

        <div class="qty">
          <button
            type="button"
            aria-label="Remove one"
          >−</button>

          <span>${item.qty}</span>

          <button
            type="button"
            aria-label="Add one"
          >+</button>
        </div>
      `;

      const buttons =
        row.querySelectorAll("button");

      buttons[0].onclick =
        () => qty(item.id, -1);

      buttons[1].onclick =
        () => qty(item.id, 1);

      itemsHost.appendChild(row);
    });
  }

  function drawer(open) {
    $("drawer")?.classList.toggle(
      "open",
      open
    );

    $("scrim")?.classList.toggle(
      "show",
      open
    );

    document.body.classList.toggle(
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

          body: JSON.stringify({
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
      !sessionBody.customerId
    ) {
      throw new Error(
        sessionBody.error ||
        "Customer session could not be verified."
      );
    }

    accessToken =
      authBody.access_token;

    return sessionBody;
  }

  $("enterBtn")
    ?.addEventListener(
      "click",
      () => {
        $("ageGate")
          ?.classList.add("hidden");
      }
    );

  $("leaveBtn")
    ?.addEventListener(
      "click",
      () => {
        const gate = $("ageGate");

        if (gate) {
          gate.querySelector(
            ".age-card"
          ).innerHTML =
            "<h2>Access unavailable</h2><p>This storefront is intended for adults 21+.</p>";
        }
      }
    );

  $("menuBtn")
    ?.addEventListener(
      "click",
      () => {
        $("nav")
          ?.classList.toggle("open");
      }
    );

  document
    .querySelectorAll("#nav a")
    .forEach(link => {
      link.onclick = () =>
        $("nav")
          ?.classList.remove("open");
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
      if (event.key === "Escape")
        drawer(false);
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

        $("zipStatus").textContent =
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
        ) return;

        $("applyStatus").textContent =
          "Application validated locally. Secure account submission is not enabled in this frontend build.";
      }
    );

  $("loginForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        if (
          !event.currentTarget
            .reportValidity()
        ) return;

        const status =
          $("loginStatus");

        const submit =
          event.currentTarget
            .querySelector(
              'button[type="submit"], button:not([type])'
            );

        const email =
          ($("loginEmail")?.value || "")
            .trim();

        const password =
          $("loginPassword")?.value || "";

        if (status) {
          status.textContent =
            "Signing in securely…";
        }

        if (submit) {
          submit.disabled = true;
        }

        try {
          const session =
            await signIn(
              email,
              password
            );

          if (status) {
            status.textContent =
              `Signed in. Customer session verified: ${session.customerId.slice(0, 8)}…`;
          }

          $("loginPassword").value = "";
        } catch (error) {
          accessToken = "";

          if (status) {
            status.textContent =
              error instanceof Error
                ? error.message
                : "Sign in failed.";
          }
        } finally {
          if (submit) {
            submit.disabled = false;
          }
        }
      }
    );

  $("checkoutBtn")
    ?.addEventListener(
      "click",
      () => {
        $("checkoutStatus").textContent =
          !cart.length
            ? "Add an item before continuing."
            : !accessToken
              ? "Sign in before continuing to protected checkout."
              : "Customer session verified. Payment execution remains protected by the server-side SonoraPort Banking route.";
      }
    );

  cats();
  render();
  bag();
})();
